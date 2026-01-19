import React, { useState, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import TextInput from 'ink-text-input'
import SelectInput from 'ink-select-input'
import { Spinner } from '../components/Spinner.js'
import { Table } from '../components/Table.js'
import { AppDataSource, User, Project, OrganisationMember } from '../db/mysql.js'
import { getProjectEventCount } from '../db/clickhouse.js'

interface UsersCommandProps {
  onBack: () => void
  initialUser?: User
  showListOnBack?: boolean
}

type Mode = 'list' | 'search' | 'detail' | 'project-detail'

interface UserWithProjectCount extends User {
  projectCount?: number
}

export function UsersCommand({ onBack, initialUser, showListOnBack = true }: UsersCommandProps) {
  const [mode, setMode] = useState<Mode>(initialUser ? 'detail' : 'list')
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<UserWithProjectCount[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(initialUser || null)
  const [userProjects, setUserProjects] = useState<Project[]>([])
  const [userOrgs, setUserOrgs] = useState<OrganisationMember[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projectEventCount, setProjectEventCount] = useState<number>(0)
  const pageSize = 10

  useEffect(() => {
    if (initialUser) {
      loadUserDetails(initialUser)
    }
  }, [initialUser])

  useInput((input, key) => {
    if (key.escape) {
      if (mode === 'project-detail') {
        setMode('detail')
        setSelectedProject(null)
      } else if (mode === 'detail') {
        if (showListOnBack) {
          setMode('list')
          setSelectedUser(null)
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
      setFilter(f => f === 'all' ? 'active' : f === 'active' ? 'inactive' : 'all')
    }
    if (key.leftArrow && page > 0) {
      setPage(p => p - 1)
    }
    if (key.rightArrow && users.length === pageSize) {
      setPage(p => p + 1)
    }
  })

  useEffect(() => {
    if (mode === 'list') {
      loadUsers()
    }
  }, [mode, page, filter])

  async function loadUsers(search?: string) {
    setLoading(true)
    setError(null)
    try {
      const repo = AppDataSource.getRepository(User)
      let query = repo.createQueryBuilder('user')
        .loadRelationCountAndMap('user.projectCount', 'user.projects')
        .orderBy('user.created', 'DESC')
        .skip(page * pageSize)
        .take(pageSize)

      if (filter === 'active') {
        query = query.andWhere('user.isActive = :active', { active: true })
      } else if (filter === 'inactive') {
        query = query.andWhere('user.isActive = :active', { active: false })
      }

      if (search) {
        const searchLower = search.toLowerCase();
        query = query.andWhere(
          '(LOWER(user.email) LIKE :search OR LOWER(user.id) LIKE :search OR LOWER(user.nickname) LIKE :search)', 
          { search: `%${searchLower}%` }
        );
      }

      const result = await query.getMany()
      setUsers(result as UserWithProjectCount[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  async function loadUserDetails(user: User) {
    setLoading(true)
    try {
      const projectRepo = AppDataSource.getRepository(Project)
      const projects = await projectRepo.find({
        where: { admin: { id: user.id } },
        relations: ['organisation'],
        order: { created: 'DESC' },
        take: 10,
      })
      setUserProjects(projects)

      const memberRepo = AppDataSource.getRepository(OrganisationMember)
      const orgs = await memberRepo.find({
        where: { user: { id: user.id } },
        relations: ['organisation'],
      })
      setUserOrgs(orgs)

      setSelectedUser(user)
      setMode('detail')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user details')
    } finally {
      setLoading(false)
    }
  }

  async function loadProjectDetails(project: Project) {
    setLoading(true)
    try {
      const count = await getProjectEventCount(project.id)
      setProjectEventCount(count)
      setSelectedProject(project)
      setMode('project-detail')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project details')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    if (searchQuery.trim()) {
      loadUsers(searchQuery.trim())
      setMode('list')
    }
  }

  const handleSelectUser = (item: { value: string }) => {
    const user = users.find(u => u.id === item.value)
    if (user) {
      loadUserDetails(user)
    }
  }

  if (loading) {
    return <Spinner text="Loading users..." />
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
        <Text bold color="yellow">🔍 Search Users</Text>
        <Box marginTop={1}>
          <Text>Search: </Text>
          <TextInput
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={handleSearch}
            placeholder="Enter email or ID..."
          />
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Press Enter to search, ESC to cancel</Text>
        </Box>
      </Box>
    )
  }

  if (mode === 'project-detail' && selectedProject) {
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
            <Text color="green" bold>{projectEventCount.toLocaleString()}</Text>
          </Text>
        </Box>

        <Box marginTop={1}>
          <Text color="gray">Press ESC to go back to user</Text>
        </Box>
      </Box>
    )
  }

  if (mode === 'detail' && selectedUser) {
    const projectItems = userProjects.map(project => ({
      label: `📁 [${project.id}] ${project.name} ${project.isArchived ? '(archived)' : ''}`,
      value: project.id,
    }))

    return (
      <Box flexDirection="column">
        <Text bold color="yellow">👤 User Details</Text>
        
        <Box flexDirection="column" marginTop={1} marginBottom={1}>
          <Text><Text color="cyan">ID:</Text> {selectedUser.id}</Text>
          <Text><Text color="cyan">Email:</Text> {selectedUser.email}</Text>
          <Text><Text color="cyan">Nickname:</Text> {selectedUser.nickname || 'N/A'}</Text>
          <Text>
            <Text color="cyan">Status:</Text>{' '}
            <Text color={selectedUser.isActive ? 'green' : 'red'}>
              {selectedUser.isActive ? 'Active' : 'Inactive'}
            </Text>
          </Text>
          <Text><Text color="cyan">Plan:</Text> {selectedUser.planCode}</Text>
          <Text><Text color="cyan">Created:</Text> {new Date(selectedUser.created).toLocaleString()}</Text>
          <Text><Text color="cyan">2FA Enabled:</Text> {selectedUser.isTwoFactorAuthenticationEnabled ? 'Yes' : 'No'}</Text>
          <Text><Text color="cyan">Max Projects:</Text> {selectedUser.maxProjects}</Text>
          <Text><Text color="cyan">API Key:</Text> {selectedUser.apiKey ? 'Set' : 'Not set'}</Text>
          {selectedUser.dashboardBlockReason && (
            <Text>
              <Text color="cyan">Block Reason:</Text>{' '}
              <Text color="red">{selectedUser.dashboardBlockReason}</Text>
            </Text>
          )}
          {selectedUser.trialEndDate && (
            <Text>
              <Text color="cyan">Trial Ends:</Text>{' '}
              {new Date(selectedUser.trialEndDate).toLocaleString()}
            </Text>
          )}
        </Box>

        {projectItems.length > 0 && (
          <Box flexDirection="column">
            <Box marginTop={1}>
              <Text bold>Projects ({projectItems.length}) - Select to view:</Text>
            </Box>
            <SelectInput 
              items={projectItems} 
              onSelect={(item) => {
                const project = userProjects.find(p => p.id === item.value)
                if (project) {
                  loadProjectDetails(project)
                }
              }} 
            />
          </Box>
        )}

        {userOrgs.length > 0 && (
          <Box flexDirection="column">
            <Box marginTop={1}>
              <Text bold>Organizations ({userOrgs.length}):</Text>
            </Box>
            <Table
              data={userOrgs}
              columns={[
                { 
                  key: 'name', 
                  header: 'Name', 
                  width: 25,
                  render: (m) => m.organisation?.name || 'N/A'
                },
                { key: 'role', header: 'Role', width: 10 },
                { 
                  key: 'confirmed', 
                  header: 'Confirmed', 
                  width: 12,
                  render: (m) => m.confirmed ? 'Yes' : 'No'
                },
              ]}
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
  const userItems = users.map(user => ({
    label: `${user.email} (${user.planCode}, ${user.projectCount || 0} projects) ${user.isActive ? '' : '[inactive]'}`,
    value: user.id,
  }))

  return (
    <Box flexDirection="column">
      <Text bold color="yellow">👥 Users</Text>
      
      <Box marginBottom={1}>
        <Text color="gray">
          Page {page + 1} | Filter: {filter} | Press S to search | F to filter | ←/→ to navigate
        </Text>
      </Box>

      {users.length === 0 ? (
        <Text color="gray">No users found</Text>
      ) : (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color="gray">Select a user to view details:</Text>
          </Box>
          <SelectInput items={userItems} onSelect={handleSelectUser} />
        </Box>
      )}
    </Box>
  )
}
