import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { CustomOutlookComponent } from './custom-outlook.component';

const routes: Routes = [
  {
    path: '',
    component: CustomOutlookComponent
  }
];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    CustomOutlookComponent
  ],
  exports: [RouterModule]
})
export class CustomOutlookModule { }
