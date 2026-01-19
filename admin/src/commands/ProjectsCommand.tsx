import React, { useState, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import TextInput from 'ink-text-input'
import SelectInput from 'ink-select-input'
import { Spinner } from '../components/Spinner.js'
import { Table } from '../components/Table.js'
import { AppDataSource, Project, User, OrganisationMember } from '../db/mysql.js'
import { getProjectEventCount } from '../db/clickhouse.js'

interface ProjectsCommandProps {
  onBack: () => void
  initialProject?: Project
  showListOnBack?: boolean
}

type Mode = 'list' | 'search' | 'detail' | 'admin-detail'

export function ProjectsCommand({ onBack, initialProject, showListOnBack = true }: ProjectsCommandProps) {
  const [mode, setMode] = useState<Mode>(initialProject ? 'detail' : 'list')
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(initialProject || null)
  const [eventCount, setEventCount] = useState<number>(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all')
  const [selectedAdmin, setSelectedAdmin] = useState<User | null>(null)
  const [adminProjects, setAdminProjects] = useState<Project[]>([])
  const [adminOrgs, setAdminOrgs] = useState<OrganisationMember[]>([])
  const pageSize = 10

  useEffect(() => {
    if (initialProject && !eventCount) {
      loadProjectDetails(initialProject)
    }
  }, [initialProject])

  useInput((input, key) => {
    if (key.escape) {
      if (mode === 'admin-detail') {
        setMode('detail')
        setSelectedAdmin(null)
      } else if (mode === 'detail') {
        if (showListOnBack) {
          setMode('list')
          setSelectedProject(null)
        } else {
          onBack()
        }
      } else {
        onBack()
      }
    }
    if (input === 's' && mode === 'list') {
      setMode('search')
    }
    if (input === 'f' && mode === 'list') {
      setFilter(f => f === 'all' ? 'active' : f === 'active' ? 'archived' : 'all')
    }
    if (key.leftArrow && page > 0) {
      setPage(p => p - 1)
    }
    if (key.rightArrow && projects.length === pageSize) {
      setPage(p => p + 1)
    }
  })

  useEffect(() => {
    if (mode === 'list') {
      loadProjects()
    }
  }, [mode, page, filter])

  async function loadProjects(search?: string) {
    setLoading(true)
    setError(null)
    try {
      const repo = AppDataSource.getRepository(Project)
      let query = repo.createQueryBuilder('project')
        .leftJoinAndSelect('project.admin', 'admin')
        .leftJoinAndSelect('project.organisation', 'organisation')
        .orderBy('project.created', 'DESC')
        .skip(page * pageSize)
        .take(pageSize)

      if (filter === 'active') {
        query = query.andWhere('project.isArchived = :archived', { archived: false })
      } else if (filter === 'archived') {
        query = query.andWhere('project.isArchived = :archived', { archived: true })
      }

      if (search) {
        const searchLower = search.toLowerCase();
        query = query.andWhere(
          '(LOWER(project.name) LIKE :search OR LOWER(project.id) LIKE :search)', 
          { search: `%${searchLower}%` }
        );
      }

      const result = await query.getMany()
      setProjects(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
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

  async function loadAdminDetails(user: User) {
    setLoading(true)
    try {
      const projectRepo = AppDataSource.getRepository(Project)
      const projects = await projectRepo.find({
        where: { admin: { id: user.id } },
        order: { created: 'DESC' },
        take: 10,
      })
      setAdminProjects(projects)

      const memberRepo = AppDataSource.getRepository(OrganisationMember)
      const orgs = await memberRepo.find({
        where: { user: { id: user.id } },
        relations: ['organisation'],
      })
      setAdminOrgs(orgs)

      setSelectedAdmin(user)
      setMode('admin-detail')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin details')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    if (searchQuery.trim()) {
      loadProjects(searchQuery.trim())
      setMode('list')
    }
  }

  const handleSelectProject = (item: { value: string }) => {
    const project = projects.find(p => p.id === item.value)
    if (project) {
      loadProjectDetails(project)
    }
  }

  if (loading) {
    return <Spinner text="Loading projects..." />
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
        <Text color="gray">Press ESC to go back</Text>
      </Box>
    )
  }

  if (mode === 'search') {
    return (
      <Box flexDirection="column">
        <Text bold color="yellow">🔍 Search Projects</Text>
        <Box marginTop={1}>
          <Text>Search: </Text>
          <TextInput
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={handleSearch}
            placeholder="Enter name or ID..."
          />
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Press Enter to search, ESC to cancel</Text>
        </Box>
      </Box>
    )
  }

  if (mode === 'admin-detail' && selectedAdmin) {
    return (
      <Box flexDirection="column">
        <Text bold color="yellow">👤 Admin Details</Text>
        
        <Box flexDirection="column" marginTop={1} marginBottom={1}>
          <Text><Text color="cyan">ID:</Text> {selectedAdmin.id}</Text>
          <Text><Text color="cyan">Email:</Text> {selectedAdmin.email}</Text>
          <Text><Text color="cyan">Nickname:</Text> {selectedAdmin.nickname || 'N/A'}</Text>
          <Text>
            <Text color="cyan">Status:</Text>{' '}
            <Text color={selectedAdmin.isActive ? 'green' : 'red'}>
              {selectedAdmin.isActive ? 'Active' : 'Inactive'}
            </Text>
          </Text>
          <Text><Text color="cyan">Plan:</Text> {selectedAdmin.planCode}</Text>
          <Text><Text color="cyan">Created:</Text> {new Date(selectedAdmin.created).toLocaleString()}</Text>
          <Text><Text color="cyan">2FA Enabled:</Text> {selectedAdmin.isTwoFactorAuthenticationEnabled ? 'Yes' : 'No'}</Text>
          <Text><Text color="cyan">Max Projects:</Text> {selectedAdmin.maxProjects}</Text>
        </Box>

        {adminProjects.length > 0 && (
          <Box flexDirection="column">
            <Box marginTop={1}>
              <Text bold>Projects ({adminProjects.length}):</Text>
            </Box>
            <Table
              data={adminProjects}
              columns={[
                { key: 'id', header: 'ID', width: 14 },
                { key: 'name', header: 'Name', width: 25 },
                { 
                  key: 'active', 
                  header: 'Status', 
                  width: 10,
                  render: (p) => p.active ? 'Active' : 'Inactive'
                },
              ]}
            />
          </Box>
        )}

        {adminOrgs.length > 0 && (
          <Box flexDirection="column">
            <Box marginTop={1}>
              <Text bold>Organizations ({adminOrgs.length}):</Text>
            </Box>
            <Table
              data={adminOrgs}
              columns={[
                { 
                  key: 'name', 
                  header: 'Name', 
                  width: 25,
                  render: (m) => m.organisation?.name || 'N/A'
                },
                { key: 'role', header: 'Role', width: 10 },
              ]}
            />
          </Box>
        )}

        <Box marginTop={1}>
          <Text color="gray">Press ESC to go back to project</Text>
        </Box>
      </Box>
    )
  }

  if (mode === 'detail' && selectedProject) {
    const adminItem = selectedProject.admin ? [{
      label: `👤 View Admin: ${selectedProject.admin.email}`,
      value: 'view-admin',
    }] : []

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
          <Text><Text color="cyan">Public:</Text> {selectedProject.public ? 'Yes' : 'No'}</Text>
          <Text><Text color="cyan">Created:</Text> {new Date(selectedProject.created).toLocaleString()}</Text>
          <Text><Text color="cyan">Website URL:</Text> {selectedProject.origins?.[0] || 'Not set'}</Text>
          <Text><Text color="cyan">All Origins:</Text> {selectedProject.origins?.join(', ') || 'None'}</Text>
          <Text><Text color="cyan">Bots Protection:</Text> {selectedProject.botsProtectionLevel}</Text>
          <Text>
            <Text color="cyan">Organization:</Text>{' '}
            {selectedProject.organisation?.name || 'None'}
          </Text>
          <Text>
            <Text color="cyan">Total Events:</Text>{' '}
            <Text color="green" bold>{eventCount.toLocaleString()}</Text>
          </Text>
        </Box>

        {adminItem.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <SelectInput 
              items={adminItem} 
              onSelect={() => {
                if (selectedProject.admin) {
                  loadAdminDetails(selectedProject.admin)
                }
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

  // List mode
  const projectItems = projects.map(project => ({
    label: `[${project.id}] ${project.name} ${project.isArchived ? '(archived)' : ''}`,
    value: project.id,
  }))

  return (
    <Box flexDirection="column">
      <Text bold color="yellow">📁 Projects</Text>
      
      <Box marginBottom={1}>
        <Text color="gray">
          Page {page + 1} | Filter: {filter} | Press S to search | F to filter | ←/→ to navigate
        </Text>
      </Box>

      {projects.length === 0 ? (
        <Text color="gray">No projects found</Text>
      ) : (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color="gray">Select a project to view details:</Text>
          </Box>
          <SelectInput items={projectItems} onSelect={handleSelectProject} />
        </Box>
      )}
    </Box>
  )
}
