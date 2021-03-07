import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { InstrumentLightingComponent } from './instrument-lighting.component';

describe('InstrumentLightingComponent', () => {
  let component: InstrumentLightingComponent;
  let fixture: ComponentFixture<InstrumentLightingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ InstrumentLightingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InstrumentLightingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
