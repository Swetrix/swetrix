import React, { useState, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import SelectInput from 'ink-select-input'
import { Spinner } from '../components/Spinner.js'
import { AppDataSource, User, Project, OrganisationMember } from '../db/mysql.js'

interface LimitsCommandProps {
  onBack: () => void
}

type Mode = 'list' | 'detail'

interface UserWithLimits extends User {
  projectCount: number
  usagePercent: number
}

export function LimitsCommand({ onBack }: LimitsCommandProps) {
  const [mode, setMode] = useState<Mode>('list')
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserWithLimits[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userProjects, setUserProjects] = useState<Project[]>([])
  const [userOrgs, setUserOrgs] = useState<OrganisationMember[]>([])
  const [error, setError] = useState<string | null>(null)
  const [threshold, setThreshold] = useState<number>(80)

  useInput((input, key) => {
    if (key.escape) {
      if (mode === 'detail') {
        setMode('list')
        setSelectedUser(null)
      } else {
        onBack()
      }
    }
    if (mode === 'list') {
      if (input === '1') setThreshold(50)
      if (input === '2') setThreshold(80)
      if (input === '3') setThreshold(90)
    }
  })

  useEffect(() => {
    loadUsersApproachingLimits()
  }, [threshold])

  async function loadUsersApproachingLimits() {
    setLoading(true)
    setError(null)
    try {
      const userRepo = AppDataSource.getRepository(User)
      
      const usersWithCounts = await userRepo
        .createQueryBuilder('user')
        .loadRelationCountAndMap('user.projectCount', 'user.projects')
        .where('user.isActive = :active', { active: true })
        .orderBy('user.created', 'DESC')
        .getMany()

      const usersApproaching: UserWithLimits[] = (usersWithCounts as (User & { projectCount: number })[])
        .map(user => ({
          ...user,
          projectCount: user.projectCount || 0,
          usagePercent: user.maxProjects > 0 
            ? Math.round((user.projectCount / user.maxProjects) * 100) 
            : 0,
        }))
        .filter(user => user.usagePercent >= threshold)
        .sort((a, b) => b.usagePercent - a.usagePercent)
        .slice(0, 50)

      setUsers(usersApproaching)
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

  if (loading) {
    return <Spinner text="Loading users approaching limits..." />
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
        <Text color="gray">Press ESC to go back</Text>
      </Box>
    )
  }

  if (mode === 'detail' && selectedUser) {
    const userWithLimits = users.find(u => u.id === selectedUser.id)
    
    return (
      <Box flexDirection="column">
        <Text bold color="yellow">👤 User Details</Text>
        
        <Box flexDirection="column" marginTop={1} marginBottom={1}>
          <Text><Text color="cyan">ID:</Text> {selectedUser.id}</Text>
          <Text><Text color="cyan">Email:</Text> {selectedUser.email}</Text>
          <Text><Text color="cyan">Nickname:</Text> {selectedUser.nickname || 'N/A'}</Text>
          <Text><Text color="cyan">Plan:</Text> {selectedUser.planCode}</Text>
          <Text>
            <Text color="cyan">Projects:</Text>{' '}
            <Text color={userWithLimits && userWithLimits.usagePercent >= 90 ? 'red' : 'yellow'} bold>
              {userWithLimits?.projectCount || 0} / {selectedUser.maxProjects}
            </Text>
            <Text color="gray"> ({userWithLimits?.usagePercent || 0}%)</Text>
          </Text>
          <Text><Text color="cyan">Created:</Text> {new Date(selectedUser.created).toLocaleString()}</Text>
          {selectedUser.trialEndDate && (
            <Text>
              <Text color="cyan">Trial Ends:</Text>{' '}
              {new Date(selectedUser.trialEndDate).toLocaleString()}
            </Text>
          )}
        </Box>

        {userProjects.length > 0 && (
          <Box flexDirection="column">
            <Text bold>Recent Projects:</Text>
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

  const userItems = users.map(user => {
    const color = user.usagePercent >= 100 ? 'red' : user.usagePercent >= 90 ? 'yellow' : 'white'
    return {
      label: `${user.email} (${user.planCode}) - ${user.projectCount}/${user.maxProjects} projects (${user.usagePercent}%)`,
      value: user.id,
    }
  })

  return (
    <Box flexDirection="column">
      <Text bold color="yellow">⚠️ Users Approaching Limits</Text>
      
      <Box marginTop={1} marginBottom={1}>
        <Text>
          Threshold:{' '}
          <Text color={threshold === 50 ? 'green' : 'gray'} bold={threshold === 50}>[1] 50%+</Text>
          {' | '}
          <Text color={threshold === 80 ? 'green' : 'gray'} bold={threshold === 80}>[2] 80%+</Text>
          {' | '}
          <Text color={threshold === 90 ? 'green' : 'gray'} bold={threshold === 90}>[3] 90%+</Text>
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="gray">Found {users.length} users at {threshold}%+ capacity</Text>
      </Box>

      {users.length === 0 ? (
        <Text color="gray">No users approaching this limit</Text>
      ) : (
        <Box flexDirection="column">
          <SelectInput 
            items={userItems} 
            onSelect={(item) => {
              const user = users.find(u => u.id === item.value)
              if (user) loadUserDetails(user)
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
