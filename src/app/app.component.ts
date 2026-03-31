import { Component, OnInit, inject } from '@angular/core';
import { ApiService } from './services/api.service';
import { PortfolioBasic } from './interfaces';
import { BASIC_DETAILS_FALLBACK, DEFAULT_PORTFOLIO_ID } from './constants/constant';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'frontend';
  basicDetails: PortfolioBasic = BASIC_DETAILS_FALLBACK;
  private readonly apiService = inject(ApiService);

  ngOnInit() {
    this.apiService.getPortfolioBasic(DEFAULT_PORTFOLIO_ID).subscribe(data => {
      this.basicDetails = data;
      console.log(data);
    });
  }
}
