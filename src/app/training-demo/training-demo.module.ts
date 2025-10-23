import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { TrainingDemoRoutingModule } from './training-demo-routing.module';
import { OutlookSignatureLabComponent } from './pages/outlook-signature-lab/outlook-signature-lab.component';
import { OutlookAddinComponent } from './pages/outlook-addin/outlook-addin.component';
import { SignatureGraderService } from './services/signature-grader.service';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TrainingDemoRoutingModule,
    OutlookSignatureLabComponent,
    OutlookAddinComponent
  ],
  providers: [
    SignatureGraderService
  ]
})
export class TrainingDemoModule { }
