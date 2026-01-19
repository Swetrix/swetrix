import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import TextInput from 'ink-text-input'
import SelectInput from 'ink-select-input'
import { Spinner } from '../components/Spinner.js'
import { AppDataSource, User, Project, Organisation, OrganisationMember } from '../db/mysql.js'
import { getProjectEventCount } from '../db/clickhouse.js'

interface SearchCommandProps {
  onBack: () => void
}

type Mode = 'input' | 'results' | 'user-detail' | 'project-detail' | 'org-detail'

interface SearchResult {
  type: 'user' | 'project' | 'org'
  id: string
  label: string
  data: User | Project | Organisation
}

export function SearchCommand({ onBack }: SearchCommandProps) {
  const [mode, setMode] = useState<Mode>('input')
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [error, setError] = useState<string | null>(null)

  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userProjects, setUserProjects] = useState<Project[]>([])
  const [userOrgs, setUserOrgs] = useState<OrganisationMember[]>([])

  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projectEventCount, setProjectEventCount] = useState<number>(0)

  const [selectedOrg, setSelectedOrg] = useState<Organisation | null>(null)
  const [orgMembers, setOrgMembers] = useState<OrganisationMember[]>([])

  useInput((input, key) => {
    if (key.escape) {
      if (mode === 'user-detail' || mode === 'project-detail' || mode === 'org-detail') {
        setMode('results')
      } else if (mode === 'results') {
        setMode('input')
        setResults([])
      } else {
        onBack()
      }
    }
  })

  async function performSearch() {
    if (!searchQuery.trim()) return
    
    setLoading(true)
    setError(null)
    setResults([])

    try {
      const query = searchQuery.trim().toLowerCase()
      const searchResults: SearchResult[] = []

      const userRepo = AppDataSource.getRepository(User)
      const users = await userRepo
        .createQueryBuilder('user')
        .where('LOWER(user.email) LIKE :query', { query: `%${query}%` })
        .orWhere('LOWER(user.id) LIKE :query', { query: `%${query}%` })
        .orWhere('LOWER(user.nickname) LIKE :query', { query: `%${query}%` })
        .take(10)
        .getMany()

      users.forEach(user => {
        searchResults.push({
          type: 'user',
          id: user.id,
          label: `👤 User: ${user.email} (${user.planCode})`,
          data: user,
        })
      })

      const projectRepo = AppDataSource.getRepository(Project)
      const projects = await projectRepo
        .createQueryBuilder('project')
        .leftJoinAndSelect('project.admin', 'admin')
        .where('LOWER(project.name) LIKE :query', { query: `%${query}%` })
        .orWhere('LOWER(project.id) LIKE :query', { query: `%${query}%` })
        .take(10)
        .getMany()

      projects.forEach(project => {
        searchResults.push({
          type: 'project',
          id: project.id,
          label: `📁 Project: [${project.id}] ${project.name}`,
          data: project,
        })
      })

      const orgRepo = AppDataSource.getRepository(Organisation)
      const orgs = await orgRepo
        .createQueryBuilder('org')
        .leftJoinAndSelect('org.members', 'members')
        .leftJoinAndSelect('org.projects', 'projects')
        .where('LOWER(org.name) LIKE :query', { query: `%${query}%` })
        .orWhere('LOWER(org.id) LIKE :query', { query: `%${query}%` })
        .take(10)
        .getMany()

      orgs.forEach(org => {
        searchResults.push({
          type: 'org',
          id: org.id,
          label: `🏢 Org: ${org.name} (${org.members?.length || 0} members)`,
          data: org,
        })
      })

      setResults(searchResults)
      setMode('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleSelectResult(item: { value: string }) {
    const result = results.find(r => `${r.type}-${r.id}` === item.value)
    if (!result) return

    setLoading(true)
    try {
      if (result.type === 'user') {
        const user = result.data as User
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
      } else if (result.type === 'project') {
        const project = result.data as Project
        const count = await getProjectEventCount(project.id)
        setProjectEventCount(count)
        setSelectedProject(project)
        setMode('project-detail')
      } else if (result.type === 'org') {
        const org = result.data as Organisation
        const memberRepo = AppDataSource.getRepository(OrganisationMember)
        const members = await memberRepo.find({
          where: { organisation: { id: org.id } },
          relations: ['user'],
        })
        setOrgMembers(members)
        setSelectedOrg(org)
        setMode('org-detail')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Spinner text="Searching..." />
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
          <Text><Text color="cyan">Projects:</Text> {userProjects.length}</Text>
          <Text><Text color="cyan">Organizations:</Text> {userOrgs.length}</Text>
        </Box>

        <Box marginTop={1}>
          <Text color="gray">Press ESC to go back to results</Text>
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
          <Text><Text color="cyan">Owner:</Text> {selectedProject.admin?.email || 'N/A'}</Text>
          <Text>
            <Text color="cyan">Total Events:</Text>{' '}
            <Text color="green" bold>{projectEventCount.toLocaleString()}</Text>
          </Text>
        </Box>

        <Box marginTop={1}>
          <Text color="gray">Press ESC to go back to results</Text>
        </Box>
      </Box>
    )
  }

  if (mode === 'org-detail' && selectedOrg) {
    return (
      <Box flexDirection="column">
        <Text bold color="yellow">🏢 Organization Details</Text>
        
        <Box flexDirection="column" marginTop={1}>
          <Text><Text color="cyan">ID:</Text> {selectedOrg.id}</Text>
          <Text><Text color="cyan">Name:</Text> {selectedOrg.name}</Text>
          <Text><Text color="cyan">Created:</Text> {new Date(selectedOrg.created).toLocaleString()}</Text>
          <Text><Text color="cyan">Members:</Text> {orgMembers.length}</Text>
          <Text><Text color="cyan">Projects:</Text> {selectedOrg.projects?.length || 0}</Text>
        </Box>

        {orgMembers.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold>Members:</Text>
            {orgMembers.slice(0, 5).map(m => (
              <Text key={m.id} color="gray">  • {m.user?.email} ({m.role})</Text>
            ))}
          </Box>
        )}

        <Box marginTop={1}>
          <Text color="gray">Press ESC to go back to results</Text>
        </Box>
      </Box>
    )
  }

  if (mode === 'results') {
    const resultItems = results.map(r => ({
      label: r.label,
      value: `${r.type}-${r.id}`,
    }))

    return (
      <Box flexDirection="column">
        <Text bold color="yellow">🔍 Search Results for "{searchQuery}"</Text>
        
        <Box marginTop={1} marginBottom={1}>
          <Text color="gray">Found {results.length} results</Text>
        </Box>

        {results.length === 0 ? (
          <Text color="gray">No results found</Text>
        ) : (
          <SelectInput items={resultItems} onSelect={handleSelectResult} />
        )}

        <Box marginTop={1}>
          <Text color="gray">Press ESC to search again</Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      <Text bold color="yellow">🔍 Global Search</Text>
      
      <Box marginTop={1}>
        <Text>Search: </Text>
        <TextInput
          value={searchQuery}
          onChange={setSearchQuery}
          onSubmit={performSearch}
          placeholder="Enter email, project ID, name, org..."
        />
      </Box>

      <Box marginTop={1}>
        <Text color="gray">Searches across users, projects, and organizations</Text>
      </Box>
      <Box>
        <Text color="gray">Press Enter to search, ESC to go back</Text>
      </Box>
    </Box>
  )
}
