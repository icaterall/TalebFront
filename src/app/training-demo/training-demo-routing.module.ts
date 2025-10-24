import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OutlookSignatureLabComponent } from './pages/outlook-signature-lab/outlook-signature-lab.component';
import { OutlookAddinComponent } from './pages/outlook-addin/outlook-addin.component';

const routes: Routes = [
  {
    path: 'outlook-signature',
    redirectTo: '/outlook-training',
    pathMatch: 'full'
  },
  {
    path: 'outlook',
    redirectTo: '/outlook-training',
    pathMatch: 'full'
  },
  {
    path: '',
    redirectTo: '/outlook-training',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TrainingDemoRoutingModule { }
