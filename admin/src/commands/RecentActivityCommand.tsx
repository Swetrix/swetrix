import React, { useState, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import SelectInput from 'ink-select-input'
import { Spinner } from '../components/Spinner.js'
import { AppDataSource, User, Project, OrganisationMember } from '../db/mysql.js'
import { getProjectEventCount } from '../db/clickhouse.js'

interface RecentActivityCommandProps {
  onBack: () => void
}

type Tab = 'users' | 'projects'
type Mode = 'list' | 'user-detail' | 'project-detail'

export function RecentActivityCommand({ onBack }: RecentActivityCommandProps) {
  const [mode, setMode] = useState<Mode>('list')
  const [tab, setTab] = useState<Tab>('users')
  const [loading, setLoading] = useState(true)
  const [recentUsers, setRecentUsers] = useState<User[]>([])
  const [recentProjects, setRecentProjects] = useState<Project[]>([])
  const [error, setError] = useState<string | null>(null)

  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userProjects, setUserProjects] = useState<Project[]>([])
  const [userOrgs, setUserOrgs] = useState<OrganisationMember[]>([])

  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projectEventCount, setProjectEventCount] = useState<number>(0)

  useInput((input, key) => {
    if (key.escape) {
      if (mode === 'user-detail' || mode === 'project-detail') {
        setMode('list')
        setSelectedUser(null)
        setSelectedProject(null)
      } else {
        onBack()
      }
    }
    if (mode === 'list') {
      if (input === '1') setTab('users')
      if (input === '2') setTab('projects')
    }
  })

  useEffect(() => {
    loadRecentActivity()
  }, [])

  async function loadRecentActivity() {
    setLoading(true)
    setError(null)
    try {
      const userRepo = AppDataSource.getRepository(User)
      const users = await userRepo.find({
        order: { created: 'DESC' },
        take: 20,
      })
      setRecentUsers(users)

      const projectRepo = AppDataSource.getRepository(Project)
      const projects = await projectRepo.find({
        relations: ['admin'],
        order: { created: 'DESC' },
        take: 20,
      })
      setRecentProjects(projects)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recent activity')
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
      setMode('user-detail')
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

  function formatTimeAgo(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - new Date(date).getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return new Date(date).toLocaleDateString()
  }

  if (loading) {
    return <Spinner text="Loading recent activity..." />
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
        <Text color="gray">Press ESC to go back</Text>
      </Box>
    )
  }

  if (mode === 'user-detail' && selectedUser) {
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
          <Text><Text color="cyan">Projects:</Text> {userProjects.length}</Text>
          {selectedUser.trialEndDate && (
            <Text>
              <Text color="cyan">Trial Ends:</Text>{' '}
              {new Date(selectedUser.trialEndDate).toLocaleString()}
            </Text>
          )}
        </Box>

        {userProjects.length > 0 && (
          <Box flexDirection="column">
            <Text bold>Projects:</Text>
            {userProjects.slice(0, 5).map(p => (
              <Text key={p.id} color="gray">  • [{p.id}] {p.name}</Text>
            ))}
          </Box>
        )}

        <Box marginTop={1}>
          <Text color="gray">Press ESC to go back</Text>
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
          </Text>
          <Text><Text color="cyan">Website URL:</Text> {selectedProject.origins?.[0] || 'Not set'}</Text>
          <Text><Text color="cyan">Created:</Text> {new Date(selectedProject.created).toLocaleString()}</Text>
          <Text><Text color="cyan">Owner:</Text> {selectedProject.admin?.email || 'N/A'}</Text>
          <Text>
            <Text color="cyan">Total Events:</Text>{' '}
            <Text color="green" bold>{projectEventCount.toLocaleString()}</Text>
          </Text>
        </Box>

        <Box marginTop={1}>
          <Text color="gray">Press ESC to go back</Text>
        </Box>
      </Box>
    )
  }

  const userItems = recentUsers.map(user => ({
    label: `${formatTimeAgo(user.created)} - ${user.email} (${user.planCode}) ${user.isActive ? '' : '[inactive]'}`,
    value: user.id,
  }))

  const projectItems = recentProjects.map(project => ({
    label: `${formatTimeAgo(project.created)} - [${project.id}] ${project.name} (${project.admin?.email || 'N/A'})`,
    value: project.id,
  }))

  return (
    <Box flexDirection="column">
      <Text bold color="yellow">📈 Recent Activity</Text>
      
      <Box marginTop={1} marginBottom={1}>
        <Text>
          View:{' '}
          <Text color={tab === 'users' ? 'green' : 'gray'} bold={tab === 'users'}>[1] Recent Signups</Text>
          {' | '}
          <Text color={tab === 'projects' ? 'green' : 'gray'} bold={tab === 'projects'}>[2] New Projects</Text>
        </Text>
      </Box>

      {tab === 'users' ? (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color="gray">Last 20 signups:</Text>
          </Box>
          <SelectInput 
            items={userItems} 
            onSelect={(item) => {
              const user = recentUsers.find(u => u.id === item.value)
              if (user) loadUserDetails(user)
            }} 
          />
        </Box>
      ) : (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color="gray">Last 20 projects created:</Text>
          </Box>
          <SelectInput 
            items={projectItems} 
            onSelect={(item) => {
              const project = recentProjects.find(p => p.id === item.value)
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
