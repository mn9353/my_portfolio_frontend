import { Component, inject } from '@angular/core';
import { PopupService } from '../../../services/popup.service';

@Component({
  selector: 'app-popup',
  standalone: true,
  templateUrl: './popup.component.html',
  styleUrl: './popup.component.css'
})
export class PopupComponent {
  readonly popupService = inject(PopupService);

  dismiss(id: number): void {
    this.popupService.dismiss(id);
  }
}
