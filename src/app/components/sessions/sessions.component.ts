import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {WorkspaceService} from '../../services/workspace.service';
import {ActivatedRoute, Router} from '@angular/router';
import {AppService} from '../../services/app.service';
import {HttpClient} from '@angular/common/http';
import {BsModalService} from 'ngx-bootstrap/modal';
import {
  compactMode, globalColumns,
  globalFilteredSessions,
  globalFilterGroup,
  GlobalFilters, globalHasFilter, IGlobalColumns
} from '../command-bar/command-bar.component';
import {Session} from '../../models/session';
import {ColumnDialogComponent} from '../dialogs/column-dialog/column-dialog.component';
import {BehaviorSubject} from 'rxjs';
import {SessionType} from '../../models/session-type';
import {AwsIamRoleFederatedSession} from '../../models/aws-iam-role-federated-session';
import {AzureSession} from '../../models/azure-session';
import {AwsSsoRoleSession} from '../../models/aws-sso-role-session';
import {AwsIamRoleChainedSession} from '../../models/aws-iam-role-chained-session';
import {SessionCardComponent} from './session-card/session-card.component';

export const optionBarIds = {};
export const globalOrderingFilter = new BehaviorSubject<Session[]>([]);

export interface ArrowSettings {
  activeArrow: boolean;
  orderStyle: boolean;
}

@Component({
  selector: 'app-session',
  templateUrl: './sessions.component.html',
  styleUrls: ['./sessions.component.scss']
})
export class SessionsComponent implements OnInit, OnDestroy {

  @ViewChild(SessionCardComponent) sessionCard;

  eGlobalFilterExtended: boolean;
  eGlobalFilteredSessions: Session[];
  eCompactMode: boolean;
  eGlobalFilterGroup: GlobalFilters;
  eGlobalColumns: IGlobalColumns;

  // Data for the select
  modalAccounts = [];
  currentSelectedColor;
  currentSelectedAccountNumber;

  // Ssm instances
  ssmloading = true;
  ssmRegions = [];

  showOnly = 'ALL';

  // For column ordering
  columnSettings: ArrowSettings[];

  private subscriptions = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    public workspaceService: WorkspaceService,
    private httpClient: HttpClient,
    private modalService: BsModalService,
    private appService: AppService
  ) {

    this.columnSettings = Array.from(Array(5)).map((): ArrowSettings => ({ activeArrow: false, orderStyle: false }));
    const subscription = globalHasFilter.subscribe(value => {
      this.eGlobalFilterExtended = value;
    });
    const subscription2 = globalFilteredSessions.subscribe(value => {
      this.eGlobalFilteredSessions = value;
    });
    const subscription3 = compactMode.subscribe(value => {
      this.eCompactMode = value;
    });
    const subscription4 = globalFilterGroup.subscribe(value => {
      this.eGlobalFilterGroup = value;
    });
    const subscription5 = globalColumns.subscribe(value => {
      this.eGlobalColumns = value;
    });

    this.subscriptions.push(subscription);
    this.subscriptions.push(subscription2);
    this.subscriptions.push(subscription3);
    this.subscriptions.push(subscription4);
    this.subscriptions.push(subscription5);

    globalOrderingFilter.next(JSON.parse(JSON.stringify(this.workspaceService.sessions)));
  }

  ngOnInit() {
    // Set regions for ssm
    this.ssmRegions = this.appService.getRegions();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
  }

  /**
   * Go to Account Management
   */
  createAccount() {
    // Go!
    this.router.navigate(['/managing', 'create-account']).then(_ => {});
  }

  openFilterColumn() {
    const modalReference = this.modalService.show(ColumnDialogComponent, {
      initialState: {eGlobalColumns: this.eGlobalColumns},
      animated: false,
      class: 'column-modal'
    });
  }

  setVisibility(name) {
    if (this.showOnly === name) {
      this.showOnly = 'ALL';
    } else {
      this.showOnly = name;
    }
  }

   orderSessionsByName(orderStyle: boolean) {
    this.resetArrowsExcept(0);
    if(!orderStyle) {
      this.columnSettings[0].activeArrow = true;
      globalOrderingFilter.next(JSON.parse(JSON.stringify(this.eGlobalFilteredSessions.sort( (a, b) => a.sessionName.localeCompare(b.sessionName)))));
      this.columnSettings[0].orderStyle = !this.columnSettings[0].orderStyle;
    } else if (this.columnSettings[0].activeArrow) {
      globalOrderingFilter.next(JSON.parse(JSON.stringify(this.eGlobalFilteredSessions.sort((a, b) => b.sessionName.localeCompare(a.sessionName)))));
      this.columnSettings[0].activeArrow = false;
    } else {
      this.columnSettings[0].orderStyle = !this.columnSettings[0].orderStyle;
      this.orderSessionsByStartTime();
    }
  }

  orderSessionsByRole(orderStyle: boolean) {
    this.resetArrowsExcept(1);
    if(!orderStyle) {
      this.columnSettings[1].activeArrow = true;
      globalOrderingFilter.next(JSON.parse(JSON.stringify(this.eGlobalFilteredSessions.sort((a, b) => {
        if(this.getRole(a) === '') {
          return 1;
        }
        if(this.getRole(b) === '') {
          return -1;
        }
        if(this.getRole(a) === this.getRole(b)) {
          return 0;
        }
        return this.getRole(a) < this.getRole(b) ? -1 : 1;
      }))));
      this.columnSettings[1].orderStyle = !this.columnSettings[1].orderStyle;
    } else if (this.columnSettings[1].activeArrow) {
      globalOrderingFilter.next(JSON.parse(JSON.stringify(this.eGlobalFilteredSessions.sort((a, b) => {
        if(this.getRole(a) === '') {
          return -1;
        }
        if(this.getRole(b) === '') {
          return 1;
        }
        if(this.getRole(a) === this.getRole(b)) {
          return 0;
        }
        return this.getRole(b) < this.getRole(a) ? -1 : 1;
      }))));
      this.columnSettings[1].activeArrow = false;
    } else {
      this.columnSettings[1].orderStyle = !this.columnSettings[1].orderStyle;
      this.orderSessionsByStartTime();
    }
  }

  orderSessionsByType(orderStyle: boolean) {
    this.resetArrowsExcept(2);
    if(!orderStyle) {
      this.columnSettings[2].activeArrow = true;
      globalOrderingFilter.next(JSON.parse(JSON.stringify(this.eGlobalFilteredSessions.sort((a, b) => a.type.localeCompare(b.type)))));
      this.columnSettings[2].orderStyle = !this.columnSettings[2].orderStyle;
    } else if (this.columnSettings[2].activeArrow) {
      globalOrderingFilter.next(JSON.parse(JSON.stringify(this.eGlobalFilteredSessions.sort((a, b) => b.type.localeCompare(a.type)))));
      this.columnSettings[2].activeArrow = false;
    } else {
      this.columnSettings[2].orderStyle = !this.columnSettings[2].orderStyle;
      this.orderSessionsByStartTime();
    }
  }

  orderSessionsByNamedProfile(orderStyle: boolean) {
    if(!orderStyle) {
      this.columnSettings[3].activeArrow = true;
      globalOrderingFilter.next(JSON.parse(JSON.stringify(this.eGlobalFilteredSessions.sort((a, b) => this.sessionCard.getProfileName(this.sessionCard.getProfileId(a)).localeCompare(this.sessionCard.getProfileName(this.sessionCard.getProfileId(b)))))));
      this.columnSettings[3].orderStyle = !this.columnSettings[3].orderStyle;
    } else if (this.columnSettings[3].activeArrow) {
      globalOrderingFilter.next(JSON.parse(JSON.stringify(this.eGlobalFilteredSessions.sort((a, b) => this.sessionCard.getProfileName(this.sessionCard.getProfileId(b)).localeCompare(this.sessionCard.getProfileName(this.sessionCard.getProfileId(a)))))));
      this.columnSettings[3].activeArrow = false;
    } else {
      this.columnSettings[3].orderStyle = !this.columnSettings[3].orderStyle;
      this.orderSessionsByStartTime();
    }
  }

  orderSessionsByNamedRegion(orderStyle: boolean) {
    this.resetArrowsExcept(4);
    if(!orderStyle) {
      this.columnSettings[4].activeArrow = true;
      globalOrderingFilter.next(JSON.parse(JSON.stringify(this.eGlobalFilteredSessions.sort((a, b) => a.region.localeCompare(b.region)))));
      this.columnSettings[4].orderStyle = !this.columnSettings[4].orderStyle;
    } else if (this.columnSettings[4].activeArrow) {
      globalOrderingFilter.next(JSON.parse(JSON.stringify(this.eGlobalFilteredSessions.sort((a, b) => b.region.localeCompare(a.region)))));
      this.columnSettings[4].activeArrow = false;
    } else {
      this.columnSettings[4].orderStyle = !this.columnSettings[4].orderStyle;
      this.orderSessionsByStartTime();
    }
  }

  orderSessionsByStartTime() {
      globalOrderingFilter.next(JSON.parse(JSON.stringify(this.eGlobalFilteredSessions.sort((a, b) => {
        if(a.startDateTime === undefined) {
          return 'z'.localeCompare(b.startDateTime);
        } else if (b.startDateTime === undefined) {
          return a.startDateTime.localeCompare('z');
        } else if (a.startDateTime === undefined && b.startDateTime === undefined) {
          return 'z'.localeCompare('z');
        } else {
          return a.startDateTime.localeCompare(b.startDateTime);
        }
      })
      )));
  }

  getRole(s: Session) {
    switch (s.type) {
      case(SessionType.awsIamRoleFederated):
        return (s as AwsIamRoleFederatedSession).roleArn.split('role/')[1];
      case(SessionType.azure):
        return (s as AzureSession).subscriptionId;
      case(SessionType.awsIamUser):
        return '';
      case(SessionType.awsSsoRole):
        const splittedRoleArn = (s as AwsSsoRoleSession).roleArn.split('/');
        splittedRoleArn.splice(0, 1);
        return splittedRoleArn.join('/');
      case(SessionType.awsIamRoleChained):
        return (s as AwsIamRoleChainedSession).roleArn.split('role/')[1];
      default:
        return '';
    }
  }

  private resetArrowsExcept(c) {
    this.columnSettings.forEach((column, index) => {
      if(index !== c) {
        column.orderStyle = false;
        column.activeArrow = false;
      }
    });
  }
}
