import {WorkspaceService} from './workspace.service';
import {TestBed} from '@angular/core/testing';
import {Workspace} from '../models/workspace';
import {mustInjected} from '../../base-injectables';
import {Session} from '../models/session';
import {AwsIamUserSession} from '../models/aws-iam-user-session';
import {serialize} from 'class-transformer';
import {AppService} from './app.service';
import {FileService} from './file.service';
import SpyObj = jasmine.SpyObj;
import {AwsSsoIntegration} from '../models/aws-sso-integration';
import * as uuid from 'uuid';
import {Constants} from '../models/constants';
import {AwsSsoRoleSession} from '../models/aws-sso-role-session';
import {KeychainService} from './keychain.service';
import {AwsSsoIntegrationService} from './aws-sso-integration.service';

describe('WorkspaceService', () => {
  let workspaceService: WorkspaceService;
  let workspace;
  let mockedSession;
  let spyAppService: SpyObj<AppService>;
  let spyFileService: SpyObj<FileService>;
  let spyKeychainService: SpyObj<KeychainService>;

  beforeEach(() => {
    spyAppService = jasmine.createSpyObj('AppService', ['getOS']);
    spyAppService.getOS.and.returnValue({ homedir : () => '~/testing' });

    spyFileService = jasmine.createSpyObj('FileService', ['encryptText', 'decryptText', 'writeFileSync', 'readFileSync', 'exists', 'newDir']);
    spyFileService.exists.and.returnValue(true);
    spyFileService.newDir.and.returnValue();
    spyFileService.encryptText.and.callFake((text: string) => text);
    spyFileService.decryptText.and.callFake((text: string) => text);
    spyFileService.writeFileSync.and.callFake((_: string, __: string) => {});
    spyFileService.readFileSync.and.callFake((_: string) => serialize(new Workspace()) );

    spyKeychainService = jasmine.createSpyObj('KeychainService' , ['getSecret']);
    spyKeychainService.getSecret.and.callFake((_: string, __: string) => 'fake-secret');

    TestBed.configureTestingModule({
      providers: [
        WorkspaceService,
        { provide: AppService, useValue: spyAppService },
        { provide: FileService, useValue: spyFileService },
        { provide: KeychainService, useValue: spyKeychainService }
      ].concat(mustInjected())
    });

    workspaceService = TestBed.inject(WorkspaceService) as WorkspaceService;
    workspaceService.createWorkspace();

    mockedSession = new AwsIamUserSession('a', 'eu-west-1', 'profile', '');
  });

  it('should be created', () => {
    expect(workspaceService).toBeTruthy();
  });

  describe('get sessions()', () => {
    it('should return an array of sessions', () => {
      workspace = new Workspace();
      workspace.sessions.push(mockedSession);
      workspaceService.sessions = [...workspace.sessions];

      expect(workspaceService.sessions).toBeInstanceOf(Array);
      expect(workspaceService.sessions[0]).toBeInstanceOf(Session);
    });
  });

  describe('set sessions()', () => {
    it('should set sessions to an array of sessions', () => {
      workspace = new Workspace();
      workspace.sessions.push(mockedSession);

      workspaceService.sessions = [...workspace.sessions];

      expect(workspaceService.sessions).toBeInstanceOf(Array);
      expect(workspaceService.sessions[0]).toBeInstanceOf(Session);
    });

    it('should call next to notify observers', () => {
      workspace = new Workspace();
      workspace.sessions.push(mockedSession);

      spyOn((workspaceService as any)._sessions, 'next').and.callThrough();

      workspaceService.sessions = [...workspace.sessions];

      expect((workspaceService as any)._sessions.next).toHaveBeenCalled();
    });
  });

  describe('create()', () => {

  });

  describe('get()', () => {
    it('should return a workspace object', () => {
      workspace = workspaceService.getWorkspace();

      expect(workspace).toBeDefined();
      expect(workspace).toBeInstanceOf(Workspace);
    });
  });

  describe('addSession()', () => {
    it('should add a sessions to the sessions array of workspace service', () => {
      const oldLength = workspaceService.sessions.length;
      workspaceService.addSession(mockedSession);
      expect(workspaceService.sessions.length).toEqual(oldLength + 1);
      expect(serialize(workspaceService.sessions[oldLength])).toEqual(serialize(mockedSession));
    });

  });

  describe('removeSession()', () => {
    it('should remove a sessions from the workspace sessions', () => {
      workspaceService.addSession(mockedSession);

      const sessionId = mockedSession.sessionId;
      const oldLength = workspaceService.sessions.length;
      workspaceService.removeSession(sessionId);

      expect(workspaceService.sessions.length).toEqual(oldLength - 1);
      expect(workspaceService.sessions.find(s => s.sessionId === sessionId)).toBeUndefined();
    });
  });

  describe('addAwsSsoIntegration()', () => {

    it('adds a new AwsSsoIntegration to workspace.awsSsoIntegrations array', () => {
      workspace = workspaceService.getWorkspace();
      const awsSsoIntegrationsLengthBefore: number = workspace.awsSsoIntegrations.length;
      workspaceService.addAwsSsoIntegration('fake-portal-url', 'fake-alias', 'fake-region', 'fake-browser-opening');
      const awsSsoIntegrationsAfter: AwsSsoIntegration[] = workspace.awsSsoIntegrations;
      expect(awsSsoIntegrationsAfter.length).toBeGreaterThan(awsSsoIntegrationsLengthBefore);
      expect(awsSsoIntegrationsAfter[awsSsoIntegrationsAfter.length - 1].portalUrl).toEqual('fake-portal-url');
      expect(awsSsoIntegrationsAfter[awsSsoIntegrationsAfter.length - 1].region).toEqual('fake-region');
      expect(awsSsoIntegrationsAfter[awsSsoIntegrationsAfter.length - 1].accessTokenExpiration).toEqual(undefined);
      expect(awsSsoIntegrationsAfter[awsSsoIntegrationsAfter.length - 1].browserOpening).toEqual('fake-browser-opening');
    });
  });

  describe('getAwsSsoIntegrationSessions', () => {
    it('returns the list of AwsSsoRoleSession objects associated to an AwsSsoIntegration', () => {
      workspaceService.addAwsSsoIntegration('fake-portal-url', 'fake-alias', 'fake-region', 'fake-browser-opening');
      workspace = workspaceService.getWorkspace();
      const awsSsoRoleSession = new AwsSsoRoleSession('fake-sessions-name', 'fake-region',
        'fake-role-arn', 'fake-profile-id', workspace.awsSsoIntegrations[0].id);
      const awsSsoRoleSession2 = new AwsSsoRoleSession('fake-sessions-name', 'fake-region',
        'fake-role-arn', 'fake-profile-id', workspace.awsSsoIntegrations[0].id);
      workspaceService.addSession(awsSsoRoleSession);
      workspaceService.addSession(awsSsoRoleSession2);
      const awsSsoIntegrationSessions = workspaceService.getAwsSsoIntegrationSessions(workspace.awsSsoIntegrations[0].id);
      expect(awsSsoIntegrationSessions.length).toEqual(2);
      expect(awsSsoIntegrationSessions[0]).toBeInstanceOf(AwsSsoRoleSession);
      expect(awsSsoIntegrationSessions[1]).toBeInstanceOf(AwsSsoRoleSession);
      expect(awsSsoIntegrationSessions[0]).toEqual(awsSsoRoleSession);
      expect(awsSsoIntegrationSessions[1]).toEqual(awsSsoRoleSession2);
    });
  });

  describe('listAwsSsoIntegrations', () => {

    it('retrieves the list of AwsSsoIntegration objects persisted in the workspace', () => {
      workspaceService.addAwsSsoIntegration('fake-portal-url', 'fake-alias', 'fake-region', 'fake-browser-opening');
      const awsSsoIntegrations = workspaceService.listAwsSsoIntegrations();
      expect(awsSsoIntegrations.length).toEqual(1);
      expect(awsSsoIntegrations[awsSsoIntegrations.length - 1].portalUrl).toEqual('fake-portal-url');
      expect(awsSsoIntegrations[awsSsoIntegrations.length - 1].region).toEqual('fake-region');
      expect(awsSsoIntegrations[awsSsoIntegrations.length - 1].accessTokenExpiration).toEqual(undefined);
      expect(awsSsoIntegrations[awsSsoIntegrations.length - 1].browserOpening).toEqual('fake-browser-opening');
    });
  });

  describe('getAwsSsoIntegrationTokenInfo', () => {

  });

  describe('deleteAwsSsoIntegration', () => {
    it('deletes the specified AwsSsoIntegration object from the array', () => {
      const id = uuid.v4();
      workspace = workspaceService.getWorkspace();

      workspace.awsSsoIntegrations.push({
        id,
        portalUrl: 'fake-portal-url',
        region: 'fake-region',
        expirationTime: undefined,
        browserOpening: Constants.inApp
      });

      workspaceService.persistWorkspace(workspace);
      workspaceService.deleteAwsSsoIntegration(id);

      expect(workspace.awsSsoIntegrations.length).toBe(0);
    });
  });

  describe('getPersistedSessions()', () => {

  });

  describe('getProfileName()', () => {
    it('should return a profile name when an id matches', () => {
      workspace = new Workspace();
      spyFileService.readFileSync.and.callFake((_: string) => serialize(workspace));
      expect(workspaceService.getProfileName(workspaceService.getWorkspace().profiles[0].id)).toEqual('default');
    });

    it('should return null  when an id NOT matches', () => {
      expect(workspaceService.getProfileName('fakeid')).toEqual(null);
    });
  });
});
