import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, In, Repository } from 'typeorm'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

import { Pagination, PaginationOptionsInterface } from '../common/pagination'
import { Project } from './entity/project.entity'
import { clickhouse } from '../common/integrations/clickhouse'
import { ProjectService } from './project.service'

dayjs.extend(utc)

interface TrafficPaginationOptions extends PaginationOptionsInterface {
  mode?: 'high-traffic' | 'low-traffic' | 'performance' | 'lost-traffic'
  period?: '1h' | '1d' | '7d' | '4w' | '3M' | '12M' | '24M' | 'all'
}

@Injectable()
export class ProjectExtraService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    private readonly projectService: ProjectService,
  ) {}

  async paginateHostnameNavigation(
    options: TrafficPaginationOptions,
    userId: string,
    search?: string,
  ): Promise<Pagination<Project>> {
    const projectIds = await this.getVisibleProjectIds(userId)

    if (!projectIds.length) {
      return new Pagination<Project>({ results: [], total: 0 })
    }

    const timeFrameClause = this.getTimeFrameClause(options.period)

    // Process project IDs in chunks to avoid overwhelming Clickhouse
    const CHUNK_SIZE = 1000
    const chunks = []
    for (let i = 0; i < projectIds.length; i += CHUNK_SIZE) {
      chunks.push(projectIds.slice(i, i + CHUNK_SIZE))
    }

    // Query to get hosts and their associated PIDs
    const query = `
        WITH hostStats AS (
          SELECT 
            host,
            pid,
            count() as visits
          FROM analytics
          WHERE pid IN {pids:Array(String)}
            AND host IS NOT NULL
            AND host != ''
            ${search ? `AND host ILIKE {search:String}` : ''}
            AND created BETWEEN ${timeFrameClause.currentStart} AND ${timeFrameClause.currentEnd}
          GROUP BY host, pid
          ORDER BY visits DESC
        )
        SELECT *
        FROM hostStats
      `

    // Execute query for each chunk and combine results
    let allResults = []
    let total = 0

    for (const chunk of chunks) {
      // eslint-disable-next-line no-await-in-loop
      const result = await clickhouse.query({
        query,
        query_params: {
          pids: chunk,
          search: `%${search}%`,
        },
        format: 'JSONEachRow',
      })

      // eslint-disable-next-line no-await-in-loop
      const chunkResults = await result.json()
      allResults = allResults.concat(chunkResults)

      if (allResults.length >= options.take) {
        break
      }
    }

    for (const chunk of chunks) {
      // Get total count for this chunk
      const countQuery = `
        WITH hostStats AS (
          SELECT 
            host,
            pid,
            count() as visits
          FROM analytics
          WHERE pid IN {pids:Array(String)}
            AND host IS NOT NULL 
            AND host != ''
            ${search ? `AND host ILIKE {search:String}` : ''}
            AND created BETWEEN ${timeFrameClause.currentStart} AND ${timeFrameClause.currentEnd}
          GROUP BY host, pid
        )
        SELECT count() as total FROM hostStats
      `

      // eslint-disable-next-line no-await-in-loop
      const countResult = await clickhouse.query({
        query: countQuery,
        query_params: {
          pids: chunk,
          search: `%${search}%`,
        },
        format: 'JSONEachRow',
      })

      // eslint-disable-next-line no-await-in-loop
      const countData = await countResult.json<{ total: number }>()
      total += countData[0]?.total || 0
    }

    // Apply pagination to combined results
    const paginatedResults = allResults.slice(
      options.skip || 0,
      (options.skip || 0) + (options.take || 10),
    )

    const uniquePids = [...new Set(paginatedResults.map(r => r.pid))]

    // Fetch full project details for the paginated results
    const projects = await this.projectService.find({
      where: { id: In(uniquePids) },
      relations: [
        'admin',
        'share',
        'share.user',
        'organisation',
        'organisation.members',
        'organisation.members.user',
      ],
    })

    const enrichedProjects = projects
      .map(project => {
        const chResults = paginatedResults.filter(r => r.pid === project.id)

        return chResults.map(chResult => ({
          ...project,
          name: chResult.host || project.name,
          trafficStats: {
            visits: chResult.visits || 0,
          },
        }))
      })
      .flat()

    const results = new Pagination<Project>({
      results: enrichedProjects.sort(
        (a, b) => (b.trafficStats?.visits || 0) - (a.trafficStats?.visits || 0),
      ),
      total,
    })

    return results
  }

  async getVisibleProjectIds(
    userId: string,
    search?: string,
  ): Promise<string[]> {
    const queryBuilder = this.projectsRepository
      .createQueryBuilder('project')
      .select('project.id')
      .leftJoin('project.admin', 'admin')
      .leftJoin('project.share', 'share')
      .leftJoin('project.organisation', 'organisation')
      .leftJoin('organisation.members', 'organisationMembers')
      .where('project.isAnalyticsProject = true')
      .where(
        new Brackets(qb => {
          qb.where('admin.id = :userId', { userId })
            .orWhere(
              new Brackets(qb2 => {
                qb2
                  .where('share.user.id = :userId')
                  .andWhere('share.confirmed = true')
              }),
            )
            .orWhere(
              new Brackets(qb3 => {
                qb3
                  .where('organisationMembers.user.id = :userId')
                  .andWhere('organisationMembers.confirmed = true')
              }),
            )
        }),
      )

    if (search?.trim()) {
      queryBuilder
        .andWhere('project.name LIKE :search')
        .setParameter('search', `%${search.trim()}%`)
    }

    const projects = await queryBuilder.getMany()
    return projects.map(p => p.id)
  }

  async paginateByTraffic(
    options: TrafficPaginationOptions,
    userId: string,
    search?: string,
    isHostnameNavigationEnabled?: boolean,
  ): Promise<Pagination<Project>> {
    // Get all visible project IDs
    const projectIds = await this.getVisibleProjectIds(
      userId,
      isHostnameNavigationEnabled ? undefined : search,
    )

    if (!projectIds.length) {
      return new Pagination<Project>({ results: [], total: 0 })
    }

    // Process project IDs in chunks to avoid overwhelming Clickhouse
    const CHUNK_SIZE = 1000
    const chunks = []
    for (let i = 0; i < projectIds.length; i += CHUNK_SIZE) {
      chunks.push(projectIds.slice(i, i + CHUNK_SIZE))
    }

    // Build the appropriate Clickhouse query based on mode
    const timeFrameClause = this.getTimeFrameClause(options.period)
    let query = ''
    let countQuery = ''

    if (isHostnameNavigationEnabled) {
      if (options.mode === 'performance') {
        query = `
          WITH 
            currentPeriod AS (
              SELECT pid, host, count() as visits
              FROM analytics
              WHERE pid IN {pids:Array(String)}
                AND created BETWEEN ${timeFrameClause.currentStart} AND ${timeFrameClause.currentEnd}
                AND host IS NOT NULL
                AND host != ''
                ${search ? `AND host ILIKE {search:String}` : ''}
              GROUP BY host, pid
            ),
            previousPeriod AS (
              SELECT pid, host, count() as visits
              FROM analytics
              WHERE pid IN {pids:Array(String)}
                AND created BETWEEN ${timeFrameClause.previousStart} AND ${timeFrameClause.previousEnd}
                AND host IS NOT NULL
                AND host != ''
                ${search ? `AND host ILIKE {search:String}` : ''}
              GROUP BY host, pid
            )
          SELECT 
            cp.pid,
            cp.host,
            cp.visits as current_visits,
            pp.visits as previous_visits,
            ((cp.visits - pp.visits) / pp.visits * 100) as percentage_change
          FROM currentPeriod cp
          JOIN previousPeriod pp ON cp.pid = pp.pid AND cp.host = pp.host
          WHERE pp.visits > 0
          ORDER BY abs(percentage_change) DESC
        `

        countQuery = `
          WITH 
            currentPeriod AS (
              SELECT pid, host, count() as visits
              FROM analytics
              WHERE pid IN {pids:Array(String)}
                AND created BETWEEN ${timeFrameClause.currentStart} AND ${timeFrameClause.currentEnd}
                AND host IS NOT NULL
                AND host != ''
                ${search ? `AND host ILIKE {search:String}` : ''}
              GROUP BY host, pid
            ),
						previousPeriod AS (
              SELECT pid, host, count() as visits
              FROM analytics
              WHERE pid IN {pids:Array(String)}
                AND created BETWEEN ${timeFrameClause.previousStart} AND ${timeFrameClause.previousEnd}
                AND host IS NOT NULL
                AND host != ''
                ${search ? `AND host ILIKE {search:String}` : ''}
              GROUP BY host, pid
            )
          SELECT count() as total
					FROM currentPeriod cp
          JOIN previousPeriod pp ON cp.pid = pp.pid AND cp.host = pp.host
					WHERE pp.visits > 0
        `
      } else if (options.mode === 'lost-traffic') {
        query = `
          WITH last_visits AS (
            SELECT 
              host,
              pid,
              max(created) as last_visit,
              count() as total_visits
            FROM analytics
            WHERE pid IN {pids:Array(String)}
              AND host IS NOT NULL
              AND host != ''
              ${search ? `AND host ILIKE {search:String}` : ''}
            GROUP BY host, pid
          ),
          hostStats AS (
            SELECT 
              host,
              pid,
              max(last_visit) as last_visit,
              sum(total_visits) as total_visits
            FROM last_visits
            GROUP BY host, pid
          )
          SELECT *
          FROM hostStats
          WHERE last_visit < (now() - INTERVAL 48 HOUR)
            AND total_visits > 0
          ORDER BY last_visit DESC
        `

        countQuery = `
          WITH last_visits AS (
            SELECT 
              host,
              pid,
              max(created) as last_visit,
              count() as total_visits
            FROM analytics
            WHERE pid IN {pids:Array(String)}
              AND host IS NOT NULL
              AND host != ''
              ${search ? `AND host ILIKE {search:String}` : ''}
            GROUP BY host, pid
          ),
          hostStats AS (
            SELECT 
              host,
              pid
            FROM last_visits
            WHERE last_visit < (now() - INTERVAL 48 HOUR)
              AND total_visits > 0
          )
          SELECT count() as total FROM hostStats
        `
      } else {
        // High/Low traffic query
        query = `
          WITH hostStats AS (
            SELECT 
              host,
              pid,
              count() as visits
            FROM analytics
            WHERE pid IN {pids:Array(String)}
              AND created BETWEEN ${timeFrameClause.currentStart} AND ${timeFrameClause.currentEnd}
              AND host IS NOT NULL
              AND host != ''
              ${search ? `AND host ILIKE {search:String}` : ''}
            GROUP BY host, pid
          )
          SELECT *
          FROM hostStats
          ORDER BY visits ${options.mode === 'high-traffic' ? 'DESC' : 'ASC'}
        `

        countQuery = `
          WITH hostStats AS (
            SELECT 
              host,
              pid
            FROM analytics
            WHERE pid IN {pids:Array(String)}
              AND created BETWEEN ${timeFrameClause.currentStart} AND ${timeFrameClause.currentEnd}
              AND host IS NOT NULL
              AND host != ''
              ${search ? `AND host ILIKE {search:String}` : ''}
            GROUP BY host, pid
          )
          SELECT count() as total FROM hostStats
        `
      }
    } else if (options.mode === 'performance') {
      query = `
          WITH 
            currentPeriod AS (
              SELECT pid, count() as visits
              FROM analytics
              WHERE pid IN {pids:Array(String)}
                AND created BETWEEN ${timeFrameClause.currentStart} AND ${timeFrameClause.currentEnd}
              GROUP BY pid
            ),
            previousPeriod AS (
              SELECT pid, count() as visits
              FROM analytics
              WHERE pid IN {pids:Array(String)}
                AND created BETWEEN ${timeFrameClause.previousStart} AND ${timeFrameClause.previousEnd}
              GROUP BY pid
            )
          SELECT 
            cp.pid,
            cp.visits as current_visits,
            pp.visits as previous_visits,
            ((cp.visits - pp.visits) / pp.visits * 100) as percentage_change
          FROM currentPeriod cp
          JOIN previousPeriod pp ON cp.pid = pp.pid
          WHERE pp.visits > 0
          ORDER BY abs(percentage_change) DESC
        `

      countQuery = `
        WITH 
          currentPeriod AS (
            SELECT pid, count() as visits
            FROM analytics
            WHERE pid IN {pids:Array(String)}
              AND created BETWEEN ${timeFrameClause.currentStart} AND ${timeFrameClause.currentEnd}
            GROUP BY pid
          ),
					previousPeriod AS (
            SELECT pid, count() as visits
            FROM analytics
            WHERE pid IN {pids:Array(String)}
              AND created BETWEEN ${timeFrameClause.previousStart} AND ${timeFrameClause.previousEnd}
            GROUP BY pid
          )
        SELECT count() as total FROM currentPeriod cp
        JOIN previousPeriod pp ON cp.pid = pp.pid
        WHERE pp.visits > 0

      `
    } else if (options.mode === 'lost-traffic') {
      query = `
          WITH last_visits AS (
            SELECT 
              pid,
              max(created) as last_visit,
              count() as total_visits
            FROM analytics
            WHERE pid IN {pids:Array(String)}
            GROUP BY pid
          )
          SELECT *
          FROM last_visits
          WHERE last_visit < (now() - INTERVAL 48 HOUR)
            AND total_visits > 0
          ORDER BY last_visit DESC
        `

      countQuery = `
        WITH last_visits AS (
          SELECT 
            pid,
            max(created) as last_visit,
            count() as total_visits
          FROM analytics
          WHERE pid IN {pids:Array(String)}
          GROUP BY pid
          HAVING last_visit < (now() - INTERVAL 48 HOUR)
            AND total_visits > 0
        )
        SELECT count() as total FROM last_visits
      `
    } else {
      // High/Low traffic query
      query = `
          SELECT 
            pid,
            count() as visits
          FROM analytics
          WHERE pid IN {pids:Array(String)}
            AND created BETWEEN ${timeFrameClause.currentStart} AND ${timeFrameClause.currentEnd}
          GROUP BY pid
          ORDER BY visits ${options.mode === 'high-traffic' ? 'DESC' : 'ASC'}
        `

      countQuery = `
        WITH projectStats AS (
          SELECT 
            pid
          FROM analytics
          WHERE pid IN {pids:Array(String)}
            AND created BETWEEN ${timeFrameClause.currentStart} AND ${timeFrameClause.currentEnd}
          GROUP BY pid
        )
        SELECT count() as total FROM projectStats
      `
    }

    // Execute query for each chunk and combine results
    let allResults = []
    let total = 0

    for (const chunk of chunks) {
      // eslint-disable-next-line no-await-in-loop
      const result = await clickhouse.query({
        query,
        query_params: {
          pids: chunk,
          search: `%${search}%`,
        },
        format: 'JSONEachRow',
      })

      // eslint-disable-next-line no-await-in-loop
      const chunkResults = await result.json()
      allResults = allResults.concat(chunkResults)

      if (allResults.length >= options.take) {
        break
      }
    }

    for (const chunk of chunks) {
      // eslint-disable-next-line no-await-in-loop
      const countResult = await clickhouse.query({
        query: countQuery,
        query_params: {
          pids: chunk,
          search: `%${search}%`,
        },
        format: 'JSONEachRow',
      })

      // eslint-disable-next-line no-await-in-loop
      const countData = await countResult.json<{ total: number }>()
      total += countData[0]?.total || 0
    }

    // Apply pagination to combined results
    const paginatedResults = allResults.slice(
      options.skip || 0,
      (options.skip || 0) + (options.take || 10),
    )

    const uniquePids = [...new Set(paginatedResults.map(r => r.pid))]

    // Fetch full project details for the paginated results
    const projects = await this.projectService.find({
      where: { id: In(uniquePids) },
      relations: [
        'admin',
        'share',
        'share.user',
        'organisation',
        'organisation.members',
        'organisation.members.user',
      ],
    })

    // Add traffic stats to projects
    const enrichedProjects = projects
      .map(project => {
        const chResults = paginatedResults.filter(r => r.pid === project.id)

        return chResults.map(chResult => ({
          ...project,
          name: chResult.host || project.name,
          trafficStats: {
            visits: chResult.visits || chResult.current_visits || 0,
            percentageChange: chResult.percentage_change,
          },
        }))
      })
      .flat()

    const results = new Pagination<Project>({
      results: enrichedProjects.sort((a, b) => {
        if (options.mode === 'performance') {
          return (
            Math.abs(b.trafficStats.percentageChange) -
            Math.abs(a.trafficStats.percentageChange)
          )
        }

        if (options.mode === 'high-traffic') {
          return (b.trafficStats.visits || 0) - (a.trafficStats.visits || 0)
        }

        if (options.mode === 'low-traffic') {
          return (a.trafficStats.visits || 0) - (b.trafficStats.visits || 0)
        }

        return (b.trafficStats.visits || 0) - (a.trafficStats.visits || 0)
      }),
      total,
    })

    return this.projectService.processDefaultResults(results, userId)
  }

  private getTimeFrameClause(period: TrafficPaginationOptions['period']): {
    currentStart: string
    currentEnd: string
    previousStart?: string
    previousEnd?: string
  } {
    const now = 'now()'

    switch (period) {
      case '1h':
        return {
          currentStart: `${now} - INTERVAL 1 HOUR`,
          currentEnd: now,
          previousStart: `${now} - INTERVAL 2 HOUR`,
          previousEnd: `${now} - INTERVAL 1 HOUR`,
        }
      case '1d':
        return {
          currentStart: `${now} - INTERVAL 1 DAY`,
          currentEnd: now,
          previousStart: `${now} - INTERVAL 2 DAY`,
          previousEnd: `${now} - INTERVAL 1 DAY`,
        }
      case '7d':
        return {
          currentStart: `${now} - INTERVAL 7 DAY`,
          currentEnd: now,
          previousStart: `${now} - INTERVAL 14 DAY`,
          previousEnd: `${now} - INTERVAL 7 DAY`,
        }
      case '4w':
        return {
          currentStart: `${now} - INTERVAL 28 DAY`,
          currentEnd: now,
          previousStart: `${now} - INTERVAL 56 DAY`,
          previousEnd: `${now} - INTERVAL 28 DAY`,
        }
      case '3M':
        return {
          currentStart: `${now} - INTERVAL 90 DAY`,
          currentEnd: now,
          previousStart: `${now} - INTERVAL 180 DAY`,
          previousEnd: `${now} - INTERVAL 90 DAY`,
        }
      case '12M':
        return {
          currentStart: `${now} - INTERVAL 365 DAY`,
          currentEnd: now,
          previousStart: `${now} - INTERVAL 730 DAY`,
          previousEnd: `${now} - INTERVAL 365 DAY`,
        }
      case '24M':
        return {
          currentStart: `${now} - INTERVAL 730 DAY`,
          currentEnd: now,
          previousStart: `${now} - INTERVAL 1460 DAY`,
          previousEnd: `${now} - INTERVAL 730 DAY`,
        }
      default: // all time
        return {
          currentStart: "toDate('2020-01-01')", // or your earliest date
          currentEnd: now,
        }
    }
  }
}
