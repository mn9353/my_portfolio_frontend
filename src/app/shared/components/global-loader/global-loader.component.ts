import { Component, inject } from '@angular/core';
import { LoaderService } from '../../../services/loader.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';

@Component({
  selector: 'app-global-loader',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './global-loader.component.html',
  styleUrl: './global-loader.component.css'
})
export class GlobalLoaderComponent {
  readonly loaderService = inject(LoaderService);
}

