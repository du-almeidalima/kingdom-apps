import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { tap } from 'rxjs';

import { DesignationRepository } from '../../../../repositories/designation.repository';
import { Designation } from '../../../../../models/designation';

@Component({
  selector: 'kingdom-apps-work-page',
  templateUrl: './work-page.component.html',
  styleUrls: ['./work-page.component.scss'],
})
export class WorkPageComponent implements OnInit {
  isLoading = false;
  designation: Designation | undefined;

  constructor(private readonly route: ActivatedRoute, private readonly designationRepository: DesignationRepository) {}

  ngOnInit(): void {
    this.isLoading = true;
    const designationId = this.route.snapshot.paramMap.get('id') ?? '';

    this.designationRepository
      .getById(designationId)
      .pipe(
        tap(() => {
          this.isLoading = false;
        })
      )
      .subscribe(designation => {
        this.designation = designation;
      });
  }
}
