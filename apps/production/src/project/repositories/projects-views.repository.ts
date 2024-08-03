import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as _map from 'lodash/map'
import { ProjectViewEntity } from '../entity/project-view.entity'
import { CreateProjectViewDto, Filter } from '../dto/create-project-view.dto'
import { UpdateProjectViewDto } from '../dto/update-project-view.dto'
import { ProjectViewCustomEventEntity } from '../entity/project-view-custom-event.entity'

@Injectable()
export class ProjectsViewsRepository {
  constructor(
    @InjectRepository(ProjectViewEntity)
    private viewsRepository: Repository<ProjectViewEntity>,
    @InjectRepository(ProjectViewCustomEventEntity)
    private projectViewCustomEventsRepository: Repository<ProjectViewCustomEventEntity>,
  ) {}

  async findViews(projectId: string): Promise<(typeof this.processView)[]> {
    const views = await this.viewsRepository.find({
      where: { projectId },
      relations: ['customEvents'],
    })

    return _map(views, this.processView)
  }

  async createProjectView(
    projectId: string,
    data: Omit<CreateProjectViewDto, 'filters'> & { filters: string },
  ) {
    const view = await this.viewsRepository.save({
      project: { id: projectId },
      ...data,
    })

    if (data.customEvents) {
      const customEventPromises = data.customEvents.map(customEvent => {
        // @ts-expect-error - mass assignment
        delete customEvent.id

        return this.projectViewCustomEventsRepository.save({
          viewId: view.id,
          ...customEvent,
        })
      })
      await Promise.all(customEventPromises)
    }

    return view
  }

  processView(
    view: ProjectViewEntity | undefined,
  ): (Omit<ProjectViewEntity, 'filters'> & { filters: Filter[] }) | undefined {
    if (!view) {
      return undefined
    }

    let filters = null

    if (view.filters) {
      try {
        filters = JSON.parse(view.filters)
      } catch (reason) {
        console.error('[ERROR] processView, failed to parse filters:', reason)
        console.error('VIEW:', view)
      }
    }

    return {
      ...view,
      filters,
    }
  }

  async findView(id: string) {
    return this.processView(
      await this.viewsRepository.findOne({
        where: { id },
        relations: ['customEvents'],
      }),
    )
  }

  async findProjectView(projectId: string, viewId: string) {
    return this.processView(
      await this.viewsRepository.findOne({
        where: { id: viewId, projectId },
        relations: ['customEvents'],
      }),
    )
  }

  async updateProjectView(
    id: string,
    data: Omit<UpdateProjectViewDto, 'filters'> & { filters: string },
  ) {
    await this.viewsRepository.update({ id }, data)
  }

  async deleteProjectView(id: string) {
    await this.viewsRepository.delete({ id })
  }
}
