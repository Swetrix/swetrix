import React, { useState, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import TextInput from 'ink-text-input'
import SelectInput from 'ink-select-input'
import { Spinner } from '../components/Spinner.js'
import { Table } from '../components/Table.js'
import { AppDataSource, Organisation, OrganisationMember } from '../db/mysql.js'

interface OrgsCommandProps {
  onBack: () => void
}

type Mode = 'list' | 'search' | 'detail'

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

  useInput((input, key) => {
    if (key.escape) {
      if (mode === 'detail') {
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

  if (mode === 'detail' && selectedOrg) {
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

        {members.length > 0 && (
          <Box flexDirection="column">
            <Box marginTop={1}>
              <Text bold>Members:</Text>
            </Box>
            <Table
              data={members}
              columns={[
                { key: 'role', header: 'Role', width: 10 },
                { 
                  key: 'email', 
                  header: 'Email', 
                  width: 35,
                  render: (m) => m.user?.email || 'N/A'
                },
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
