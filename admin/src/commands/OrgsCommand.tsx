import React, { useState, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import TextInput from 'ink-text-input'
import SelectInput from 'ink-select-input'
import { Spinner } from '../components/Spinner.js'
import { Table } from '../components/Table.js'
import { AppDataSource, Organisation, OrganisationMember, User, Project } from '../db/mysql.js'
import { getProjectEventCount } from '../db/clickhouse.js'

interface OrgsCommandProps {
  onBack: () => void
}

type Mode = 'list' | 'search' | 'detail' | 'user-detail' | 'project-detail'

export function OrgsCommand({ onBack }: OrgsCommandProps) {
  const [mode, setMode] = useState<Mode>('list')
  const [loading, setLoading] = useState(false)
  const [orgs, setOrgs] = useState<Organisation[]>([])
  const [selectedOrg, setSelectedOrg] = useState<Organisation | null>(null)
  const [members, setMembers] = useState<OrganisationMember[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const pageSize = 10

  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userProjects, setUserProjects] = useState<Project[]>([])
  const [userOrgs, setUserOrgs] = useState<OrganisationMember[]>([])

  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projectEventCount, setProjectEventCount] = useState<number>(0)

  useInput((input, key) => {
    if (key.escape) {
      if (mode === 'user-detail' || mode === 'project-detail') {
        setMode('detail')
        setSelectedUser(null)
        setSelectedProject(null)
      } else if (mode === 'detail') {
        setMode('list')
        setSelectedOrg(null)
      } else {
        onBack()
      }
    }
    if (input === 's' && mode === 'list') {
      setMode('search')
    }
    if (key.leftArrow && page > 0) {
      setPage(p => p - 1)
    }
    if (key.rightArrow && orgs.length === pageSize) {
      setPage(p => p + 1)
    }
  })

  useEffect(() => {
    if (mode === 'list') {
      loadOrgs()
    }
  }, [mode, page])

  async function loadOrgs(search?: string) {
    setLoading(true)
    setError(null)
    try {
      const repo = AppDataSource.getRepository(Organisation)
      let query = repo.createQueryBuilder('org')
        .leftJoinAndSelect('org.members', 'members')
        .leftJoinAndSelect('org.projects', 'projects')
        .orderBy('org.created', 'DESC')
        .skip(page * pageSize)
        .take(pageSize)

      if (search) {
        query = query.where('org.name LIKE :search OR org.id LIKE :search', { 
          search: `%${search}%` 
        })
      }

      const result = await query.getMany()
      setOrgs(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organizations')
    } finally {
      setLoading(false)
    }
  }

  async function loadOrgDetails(org: Organisation) {
    setLoading(true)
    try {
      const memberRepo = AppDataSource.getRepository(OrganisationMember)
      const orgMembers = await memberRepo.find({
        where: { organisation: { id: org.id } },
        relations: ['user'],
      })
      setMembers(orgMembers)
      setSelectedOrg(org)
      setMode('detail')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organization details')
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

  const handleSearch = () => {
    if (searchQuery.trim()) {
      loadOrgs(searchQuery.trim())
      setMode('list')
    }
  }

  const handleSelectOrg = (item: { value: string }) => {
    const org = orgs.find(o => o.id === item.value)
    if (org) {
      loadOrgDetails(org)
    }
  }

  if (loading) {
    return <Spinner text="Loading organizations..." />
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
        <Text bold color="yellow">🔍 Search Organizations</Text>
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

  if (mode === 'user-detail' && selectedUser) {
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
        </Box>

        {projectItems.length > 0 && (
          <Box flexDirection="column">
            <Box marginTop={1}>
              <Text bold>Projects ({projectItems.length}):</Text>
            </Box>
            <Table
              data={userProjects}
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
              ]}
            />
          </Box>
        )}

        <Box marginTop={1}>
          <Text color="gray">Press ESC to go back to organization</Text>
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
            <Text color="cyan">Total Events:</Text>{' '}
            <Text color="green" bold>{projectEventCount.toLocaleString()}</Text>
          </Text>
        </Box>

        <Box marginTop={1}>
          <Text color="gray">Press ESC to go back to organization</Text>
        </Box>
      </Box>
    )
  }

  if (mode === 'detail' && selectedOrg) {
    const memberItems = members.filter(m => m.user).map(member => ({
      label: `👤 ${member.user?.email} (${member.role}) ${member.confirmed ? '' : '[pending]'}`,
      value: member.user?.id || '',
    }))

    const projectItems = (selectedOrg.projects || []).map(project => ({
      label: `📁 [${project.id}] ${project.name} ${project.isArchived ? '(archived)' : ''}`,
      value: project.id,
    }))

    const allItems = [
      ...memberItems,
      ...projectItems,
    ]

    return (
      <Box flexDirection="column">
        <Text bold color="yellow">🏢 Organization Details</Text>
        
        <Box flexDirection="column" marginTop={1} marginBottom={1}>
          <Text><Text color="cyan">ID:</Text> {selectedOrg.id}</Text>
          <Text><Text color="cyan">Name:</Text> {selectedOrg.name}</Text>
          <Text><Text color="cyan">Created:</Text> {new Date(selectedOrg.created).toLocaleString()}</Text>
          <Text><Text color="cyan">Projects:</Text> {selectedOrg.projects?.length || 0}</Text>
          <Text><Text color="cyan">Members:</Text> {members.length}</Text>
        </Box>

        {allItems.length > 0 && (
          <Box flexDirection="column">
            <Box marginTop={1}>
              <Text bold>Members & Projects - Select to view:</Text>
            </Box>
            <SelectInput 
              items={allItems} 
              onSelect={(item) => {
                const member = members.find(m => m.user?.id === item.value)
                if (member && member.user) {
                  loadUserDetails(member.user)
                  return
                }
                const project = selectedOrg.projects?.find(p => p.id === item.value)
                if (project) {
                  loadProjectDetails(project)
                }
              }} 
            />
          </Box>
        )}

        <Box marginTop={1}>
          <Text color="gray">Press ESC to go back to list</Text>
        </Box>
      </Box>
    )
  }

  // List mode
  const orgItems = orgs.map(org => ({
    label: `${org.name} (${org.members?.length || 0} members, ${org.projects?.length || 0} projects)`,
    value: org.id,
  }))

  return (
    <Box flexDirection="column">
      <Text bold color="yellow">🏢 Organizations</Text>
      
      <Box marginBottom={1}>
        <Text color="gray">
          Page {page + 1} | Press S to search | ←/→ to navigate pages
        </Text>
      </Box>

      {orgs.length === 0 ? (
        <Text color="gray">No organizations found</Text>
      ) : (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color="gray">Select an organization to view details:</Text>
          </Box>
          <SelectInput items={orgItems} onSelect={handleSelectOrg} />
        </Box>
      )}
    </Box>
  )
}
