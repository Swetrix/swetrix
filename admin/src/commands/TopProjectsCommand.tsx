import React, { useState, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import SelectInput from 'ink-select-input'
import { Spinner } from '../components/Spinner.js'
import { Table } from '../components/Table.js'
import { getTopProjectsByEvents, TopProject, getProjectEventCount } from '../db/clickhouse.js'
import { AppDataSource, Project } from '../db/mysql.js'

interface TopProjectsCommandProps {
  onBack: () => void
}

type Period = '24h' | '7d' | '30d'
type Mode = 'list' | 'detail'

const periodDays: Record<Period, number> = {
  '24h': 1,
  '7d': 7,
  '30d': 30,
}

interface ProjectWithEvents extends TopProject {
  name?: string
  adminEmail?: string
}

export function TopProjectsCommand({ onBack }: TopProjectsCommandProps) {
  const [mode, setMode] = useState<Mode>('list')
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('7d')
  const [projects, setProjects] = useState<ProjectWithEvents[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [eventCount, setEventCount] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)

  useInput((input, key) => {
    if (key.escape) {
      if (mode === 'detail') {
        setMode('list')
        setSelectedProject(null)
      } else {
        onBack()
      }
    }
    if (mode === 'list') {
      if (input === '1') setPeriod('24h')
      if (input === '2') setPeriod('7d')
      if (input === '3') setPeriod('30d')
    }
  })

  useEffect(() => {
    loadTopProjects()
  }, [period])

  async function loadTopProjects() {
    setLoading(true)
    setError(null)
    try {
      const topProjects = await getTopProjectsByEvents(periodDays[period], 20)
      
      if (topProjects.length === 0) {
        setProjects([])
        setLoading(false)
        return
      }

      const projectRepo = AppDataSource.getRepository(Project)
      const pids = topProjects.map(p => p.pid)
      
      const dbProjects = await projectRepo
        .createQueryBuilder('project')
        .leftJoinAndSelect('project.admin', 'admin')
        .where('project.id IN (:...pids)', { pids })
        .getMany()

      const projectMap = new Map(dbProjects.map(p => [p.id, p]))

      const enrichedProjects: ProjectWithEvents[] = topProjects.map(tp => ({
        ...tp,
        name: projectMap.get(tp.pid)?.name || 'Unknown',
        adminEmail: projectMap.get(tp.pid)?.admin?.email || 'N/A',
      }))

      setProjects(enrichedProjects)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load top projects')
    } finally {
      setLoading(false)
    }
  }

  async function loadProjectDetails(pid: string) {
    setLoading(true)
    try {
      const projectRepo = AppDataSource.getRepository(Project)
      const project = await projectRepo.findOne({
        where: { id: pid },
        relations: ['admin', 'organisation'],
      })
      
      if (project) {
        const count = await getProjectEventCount(pid)
        setEventCount(count)
        setSelectedProject(project)
        setMode('detail')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Spinner text="Loading top projects..." />
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
        <Text color="gray">Press ESC to go back</Text>
      </Box>
    )
  }

  if (mode === 'detail' && selectedProject) {
    return (
      <Box flexDirection="column">
        <Text bold color="yellow">📁 Project Details</Text>
        
        <Box flexDirection="column" marginTop={1}>
          <Text><Text color="cyan">ID:</Text> {selectedProject.id}</Text>
          <Text><Text color="cyan">Name:</Text> {selectedProject.name}</Text>
          <Text>
            <Text color="cyan">Status:</Text>{' '}
            <Text color={selectedProject.active ? 'green' : 'red'}>
              {selectedProject.active ? 'Active' : 'Inactive'}
            </Text>
            {selectedProject.isArchived && <Text color="yellow"> (Archived)</Text>}
          </Text>
          <Text><Text color="cyan">Website URL:</Text> {selectedProject.origins?.[0] || 'Not set'}</Text>
          <Text><Text color="cyan">Owner:</Text> {selectedProject.admin?.email || 'N/A'}</Text>
          <Text>
            <Text color="cyan">Organization:</Text>{' '}
            {selectedProject.organisation?.name || 'None'}
          </Text>
          <Text>
            <Text color="cyan">Total Events:</Text>{' '}
            <Text color="green" bold>{eventCount.toLocaleString()}</Text>
          </Text>
        </Box>

        <Box marginTop={1}>
          <Text color="gray">Press ESC to go back</Text>
        </Box>
      </Box>
    )
  }

  const projectItems = projects.map((p, index) => ({
    label: `${index + 1}. [${p.pid}] ${p.name} - ${p.eventCount.toLocaleString()} events (${p.adminEmail})`,
    value: p.pid,
  }))

  return (
    <Box flexDirection="column">
      <Text bold color="yellow">🔥 Top Projects by Events</Text>
      
      <Box marginTop={1} marginBottom={1}>
        <Text>
          Period:{' '}
          <Text color={period === '24h' ? 'green' : 'gray'} bold={period === '24h'}>[1] 24h</Text>
          {' | '}
          <Text color={period === '7d' ? 'green' : 'gray'} bold={period === '7d'}>[2] 7 days</Text>
          {' | '}
          <Text color={period === '30d' ? 'green' : 'gray'} bold={period === '30d'}>[3] 30 days</Text>
        </Text>
      </Box>

      {projects.length === 0 ? (
        <Text color="gray">No projects with events in this period</Text>
      ) : (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color="gray">Select a project to view details:</Text>
          </Box>
          <SelectInput 
            items={projectItems} 
            onSelect={(item) => loadProjectDetails(item.value)} 
          />
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray">Press ESC to go back</Text>
      </Box>
    </Box>
  )
}
