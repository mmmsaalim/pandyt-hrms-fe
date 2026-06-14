import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrossTenantReportsComponent } from './cross-tenant-reports.component';

describe('CrossTenantReportsComponent', () => {
  let component: CrossTenantReportsComponent;
  let fixture: ComponentFixture<CrossTenantReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrossTenantReportsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrossTenantReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
