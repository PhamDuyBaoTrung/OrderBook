import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {InstrumentLightingComponent} from './instrument-lighting/instrument-lighting.component';


const routes: Routes = [
  {
    path: 'light',
    component: InstrumentLightingComponent
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
