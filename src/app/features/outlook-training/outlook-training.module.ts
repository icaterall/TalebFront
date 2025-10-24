import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { OutlookTrainingComponent } from './outlook-training.component';
import { OutlookHeaderComponent } from './components/outlook-header/outlook-header.component';
import { OutlookSidebarComponent } from './components/outlook-sidebar/outlook-sidebar.component';
import { OutlookMainContentComponent } from './components/outlook-main-content/outlook-main-content.component';
import { OutlookEmailListComponent } from './components/outlook-email-list/outlook-email-list.component';
import { OutlookQuestionsSidebarComponent } from './components/outlook-questions-sidebar/outlook-questions-sidebar.component';

const routes = [
  {
    path: '',
    component: OutlookTrainingComponent
  }
];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    RouterModule.forChild(routes),
    OutlookTrainingComponent,
    OutlookHeaderComponent,
    OutlookSidebarComponent,
    OutlookMainContentComponent,
    OutlookEmailListComponent,
    OutlookQuestionsSidebarComponent
  ]
})
export class OutlookTrainingModule { }
