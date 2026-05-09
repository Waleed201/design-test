import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TemplateDto {
  id?: number;
  name: string;
  fabricJson: string;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class TemplateService {
  private readonly baseUrl = `${environment.apiBase}/template`;

  // In-memory fallback when backend is not reachable
  private localTemplate: TemplateDto | null = null;

  constructor(private http: HttpClient) {}

  saveTemplate(template: TemplateDto): Observable<TemplateDto> {
    return this.http.post<TemplateDto>(this.baseUrl, template);
  }

  getTemplate(id: number): Observable<TemplateDto> {
    return this.http.get<TemplateDto>(`${this.baseUrl}/${id}`);
  }

  getLatestTemplate(): Observable<TemplateDto> {
    return this.http.get<TemplateDto>(`${this.baseUrl}/latest`);
  }

  generatePdf(id: number, variables: Record<string, string>): Observable<Blob> {
    return this.http.post(`${environment.apiBase}/generate-pdf/${id}`, variables, { responseType: 'blob' });
  }

  // Local storage helpers for PoC offline mode
  saveLocal(template: TemplateDto): void {
    this.localTemplate = template;
    localStorage.setItem('cert_template', JSON.stringify(template));
  }

  loadLocal(): TemplateDto | null {
    const raw = localStorage.getItem('cert_template');
    return raw ? JSON.parse(raw) : null;
  }

  clearLocal(): void {
    localStorage.removeItem('cert_template');
    this.localTemplate = null;
  }
}
