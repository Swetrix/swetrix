import 'reflect-metadata'
import {
  DataSource,
  Entity,
  PrimaryColumn,
  QueryResult,
  QueryRunner,
} from 'typeorm'

jest.mock('../user/entities/user.entity', () => ({ User: class User {} }))
jest.mock('../project/entity/project.entity', () => ({
  Project: class Project {},
}))
jest.mock('../organisation/entity/organisation.entity', () => ({
  Organisation: class Organisation {},
}))
jest.mock('../alert/entity/alert.entity', () => ({ Alert: class Alert {} }))
jest.mock('../project/project.service', () => ({ ProjectService: class {} }))
jest.mock('../organisation/organisation.service', () => ({
  OrganisationService: class {},
}))
jest.mock('../common/constants', () => ({ PID_REGEX: /^[a-zA-Z0-9]{12}$/ }))
jest.mock('../auth/decorators', () => ({ Auth: () => () => {} }))
jest.mock('./dispatchers/channel-dispatcher.service', () => ({
  ChannelDispatcherService: class {},
}))
jest.mock('../mailer/mailer.service', () => ({ MailerService: class {} }))

import { User } from '../user/entities/user.entity'
import { Project } from '../project/entity/project.entity'
import { Organisation } from '../organisation/entity/organisation.entity'
import { Alert } from '../alert/entity/alert.entity'
import {
  NotificationChannel,
  NotificationChannelType,
} from './entity/notification-channel.entity'
import { NotificationChannelController } from './notification-channel.controller'
import { NotificationChannelService } from './notification-channel.service'

for (const target of [User, Project, Organisation, Alert]) {
  Entity()(target)
  PrimaryColumn('varchar')(target.prototype, 'id')
}

describe('notification channel list scope', () => {
  let controller: NotificationChannelController

  beforeEach(async () => {
    const source = new DataSource({
      type: 'mysql',
      database: 'notification_channel_test',
      entities: [NotificationChannel, User, Project, Organisation, Alert],
    })
    await (source as any).buildMetadatas()

    const query = jest.fn(async (_sql: string, parameters: string[]) => {
      const ownerId = parameters[0]
      const scope = ownerId.split('-')[0]
      const result = new QueryResult()
      result.records = [
        {
          NotificationChannel_id: `${scope}-channel`,
          NotificationChannel_name: 'Slack alerts',
          NotificationChannel_type: NotificationChannelType.SLACK,
          NotificationChannel_config: JSON.stringify({
            url: 'https://hooks.slack.com/services/T000/B000/secret',
          }),
          NotificationChannel_isVerified: 1,
          NotificationChannel_userId: scope === 'user' ? ownerId : null,
          NotificationChannel_organisationId:
            scope === 'organisation' ? ownerId : null,
          NotificationChannel_projectId: scope === 'project' ? ownerId : null,
        },
      ]
      return result
    })
    jest.spyOn(source, 'createQueryRunner').mockReturnValue({
      query,
      release: jest.fn(),
      broadcaster: { broadcast: jest.fn() },
      isTransactionActive: false,
      isReleased: false,
    } as unknown as QueryRunner)

    const projects = {
      getProjectIdsViewableByUser: jest.fn(async () => ['project-id']),
      getFullProject: jest.fn(async () => ({
        id: 'project-id',
        admin: { id: 'user-id' },
        organisation: { id: 'organisation-id' },
      })),
      allowedToManage: jest.fn(),
    }
    const organisations = {
      findMemberships: jest.fn(async () => [
        { organisation: { id: 'organisation-id' } },
      ]),
    }
    const service = new NotificationChannelService(
      source.getRepository(NotificationChannel),
      projects as any,
      organisations as any,
    )
    controller = new NotificationChannelController(
      service,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    )
  })

  const expectedChannel = (scope: string) => ({
    id: `${scope}-channel`,
    scope,
    userId: scope === 'user' ? 'user-id' : null,
    organisationId: scope === 'organisation' ? 'organisation-id' : null,
    projectId: scope === 'project' ? 'project-id' : null,
  })

  it('keeps a persisted Slack channel visible in personal settings after reloading', async () => {
    const channels = await controller.list(
      'user-id',
      undefined,
      undefined,
      'user',
    )

    expect(channels).toHaveLength(1)
    expect(channels[0]).toMatchObject({
      ...expectedChannel('user'),
      type: 'slack',
      isVerified: true,
      config: { url: 'https://hooks.slack.com/services/T000/…' },
    })
  })

  it('preserves ownership for all visible channel scopes', async () => {
    const channels = await controller.list('user-id')

    expect(channels).toHaveLength(3)
    expect(channels).toEqual(
      expect.arrayContaining(
        ['user', 'organisation', 'project'].map((scope) =>
          expect.objectContaining(expectedChannel(scope)),
        ),
      ),
    )
  })

  it('preserves ownership for project and inherited channels', async () => {
    const channels = await controller.list('user-id', 'project-id')

    expect(channels).toHaveLength(3)
    expect(channels).toEqual(
      expect.arrayContaining(
        ['user', 'organisation', 'project'].map((scope) =>
          expect.objectContaining(expectedChannel(scope)),
        ),
      ),
    )
  })

  it('preserves ownership for organisation settings', async () => {
    const channels = await controller.list(
      'user-id',
      undefined,
      'organisation-id',
    )

    expect(channels).toHaveLength(1)
    expect(channels[0]).toMatchObject(expectedChannel('organisation'))
  })
})
