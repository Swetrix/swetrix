import React, { useState, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import SelectInput from 'ink-select-input'
import { Spinner } from '../components/Spinner.js'
import { getProjectsWithRecentEvents, getProjectEventCount } from '../db/clickhouse.js'
import { AppDataSource, Project } from '../db/mysql.js'

interface InactiveProjectsCommandProps {
  onBack: () => void
}

type Period = '30d' | '60d' | '90d'
type Mode = 'list' | 'detail'

const periodDays: Record<Period, number> = {
  '30d': 30,
  '60d': 60,
  '90d': 90,
}

interface InactiveProject extends Project {
  adminEmail?: string
  lastEventDays?: number
}

export function InactiveProjectsCommand({ onBack }: InactiveProjectsCommandProps) {
  const [mode, setMode] = useState<Mode>('list')
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('30d')
  const [projects, setProjects] = useState<InactiveProject[]>([])
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
      if (input === '1') setPeriod('30d')
      if (input === '2') setPeriod('60d')
      if (input === '3') setPeriod('90d')
    }
  })

  useEffect(() => {
    loadInactiveProjects()
  }, [period])

  async function loadInactiveProjects() {
    setLoading(true)
    setError(null)
    try {
      const activeProjectPids = await getProjectsWithRecentEvents(periodDays[period])
      
      const projectRepo = AppDataSource.getRepository(Project)
      const allProjects = await projectRepo
        .createQueryBuilder('project')
        .leftJoinAndSelect('project.admin', 'admin')
        .where('project.isArchived = :archived', { archived: false })
        .orderBy('project.created', 'DESC')
        .getMany()

      const inactiveProjects: InactiveProject[] = allProjects
        .filter(p => !activeProjectPids.has(p.id))
        .map(p => ({
          ...p,
          adminEmail: p.admin?.email || 'N/A',
        }))
        .slice(0, 50)

      setProjects(inactiveProjects)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inactive projects')
    } finally {
      setLoading(false)
    }
  }

  async function loadProjectDetails(project: Project) {
    setLoading(true)
    try {
      const count = await getProjectEventCount(project.id)
      setEventCount(count)
      setSelectedProject(project)
      setMode('detail')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Spinner text="Finding inactive projects..." />
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
          </Text>
          <Text><Text color="cyan">Website URL:</Text> {selectedProject.origins?.[0] || 'Not set'}</Text>
          <Text><Text color="cyan">Created:</Text> {new Date(selectedProject.created).toLocaleString()}</Text>
          <Text><Text color="cyan">Owner:</Text> {selectedProject.admin?.email || 'N/A'}</Text>
          <Text>
            <Text color="cyan">Total Events (all time):</Text>{' '}
            <Text color="yellow">{eventCount.toLocaleString()}</Text>
          </Text>
          <Text color="red" bold>
            ⚠️ No events in the last {periodDays[period]} days
          </Text>
        </Box>

        <Box marginTop={1}>
          <Text color="gray">Press ESC to go back</Text>
        </Box>
      </Box>
    )
  }

  const projectItems = projects.map(p => ({
    label: `[${p.id}] ${p.name} - ${p.adminEmail}`,
    value: p.id,
  }))

  return (
    <Box flexDirection="column">
      <Text bold color="yellow">💀 Inactive/Zombie Projects</Text>
      
      <Box marginTop={1} marginBottom={1}>
        <Text>
          No events in:{' '}
          <Text color={period === '30d' ? 'green' : 'gray'} bold={period === '30d'}>[1] 30 days</Text>
          {' | '}
          <Text color={period === '60d' ? 'green' : 'gray'} bold={period === '60d'}>[2] 60 days</Text>
          {' | '}
          <Text color={period === '90d' ? 'green' : 'gray'} bold={period === '90d'}>[3] 90 days</Text>
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="gray">Found {projects.length} inactive projects (showing first 50)</Text>
      </Box>

      {projects.length === 0 ? (
        <Text color="green">No inactive projects found!</Text>
      ) : (
        <Box flexDirection="column">
          <SelectInput 
            items={projectItems} 
            onSelect={(item) => {
              const project = projects.find(p => p.id === item.value)
              if (project) loadProjectDetails(project)
            }} 
          />
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray">Press ESC to go back</Text>
      </Box>
    </Box>
  )
}
