import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { ProxyDomainController } from './proxy-domain.controller'
import { ProxyDomainConnectService } from './proxy-domain-connect.service'
import { ProxyDomainService } from './proxy-domain.service'
import { ProjectService } from './project.service'

jest.mock('./project.service', () => ({ ProjectService: class {} }))
jest.mock('./proxy-domain.service', () => ({
  ProxyDomainService: class {},
  PROXY_BASE_DOMAIN: 'proxy.swetrix.org',
}))
jest.mock('../common/constants', () => ({
  isValidPID: (pid: string) => pid === 'project-id',
}))
jest.mock('../auth/decorators', () => ({
  Auth: () => () => {},
  Public: () => () => {},
}))

const project = { id: 'project-id' }
const storedDomain = {
  hostname: 't.example.com',
  proxyTargetId: 'stored-target',
}

function setup() {
  const domains = { findById: jest.fn().mockResolvedValue(storedDomain) }
  const projects = {
    getFullProject: jest.fn().mockResolvedValue(project),
    allowedToManage: jest.fn(),
  }
  const connect = {
    createUrl: jest.fn().mockReturnValue('https://dash.cloudflare.com/signed'),
  }
  const controller = new ProxyDomainController(
    domains as unknown as ProxyDomainService,
    projects as unknown as ProjectService,
    connect as unknown as ProxyDomainConnectService,
  )
  return { controller, domains, projects, connect }
}

it('checks management access and uses only the proxy saved in the requested project', async () => {
  const { controller, domains, projects, connect } = setup()
  await expect(
    controller.configureCloudflare('project-id', 'domain-id', 'user-id'),
  ).resolves.toEqual({ url: 'https://dash.cloudflare.com/signed' })
  expect(projects.allowedToManage).toHaveBeenCalledWith(project, 'user-id')
  expect(domains.findById).toHaveBeenCalledWith('project-id', 'domain-id')
  expect(connect.createUrl).toHaveBeenCalledWith(
    'project-id',
    storedDomain.hostname,
    storedDomain.proxyTargetId,
  )
})

it('does not issue a signed URL to a user without management access', async () => {
  const { controller, domains, projects, connect } = setup()
  projects.allowedToManage.mockImplementation(() => {
    throw new ForbiddenException()
  })
  await expect(
    controller.configureCloudflare('project-id', 'domain-id', 'viewer-id'),
  ).rejects.toThrow(ForbiddenException)
  expect(domains.findById).not.toHaveBeenCalled()
  expect(connect.createUrl).not.toHaveBeenCalled()
})

it('does not issue a signed URL for a proxy outside the project', async () => {
  const { controller, domains, connect } = setup()
  domains.findById.mockRejectedValue(new NotFoundException())
  await expect(
    controller.configureCloudflare('project-id', 'other-domain-id', 'user-id'),
  ).rejects.toThrow(NotFoundException)
  expect(connect.createUrl).not.toHaveBeenCalled()
})
