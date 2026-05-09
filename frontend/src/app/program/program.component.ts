import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { fabric } from 'fabric';
import { TemplateService } from '../services/template.service';

interface VariableEntry {
  placeholder: string;
  value: string;
}

@Component({
  selector: 'app-program',
  templateUrl: './program.component.html'
})
export class ProgramComponent implements AfterViewInit, OnDestroy {
  @ViewChild('fabricCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('previewCanvas') previewCanvasRef!: ElementRef<HTMLCanvasElement>;

  canvas!: fabric.Canvas;
  previewCanvas!: fabric.Canvas;

  variables: VariableEntry[] = [];
  statusMessage = '';
  statusType: 'success' | 'danger' | 'info' = 'info';
  templateLoaded = false;
  isGenerating = false;
  isApplied = false;
  templateJson = '';
  templateId: number | null = null;
  newVarKey = '';

  constructor(private templateService: TemplateService, private router: Router) {}

  ngAfterViewInit(): void {
    this.canvas = new fabric.Canvas(this.canvasRef.nativeElement, {
      width: 1000,
      height: 700,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: false
    });

    // All objects non-interactive in program mode
    this.canvas.on('object:added', (e) => {
      const obj = e.target;
      if (obj) {
        obj.set({ selectable: false, evented: false } as any);
      }
    });

    const saved = this.templateService.loadLocal();
    if (saved?.fabricJson) {
      this.templateJson = saved.fabricJson;
      this.canvas.loadFromJSON(this.templateJson, () => {
        this.lockAll();
        this.canvas.renderAll();
        this.templateLoaded = true;
        this.extractVariables();
        this.showStatus('Template loaded. Fill in the variables below.', 'info');
      });
    } else {
      this.showStatus('No template found. Please complete Stages 1 and 2 first.', 'danger');
    }
  }

  ngOnDestroy(): void {
    this.canvas?.dispose();
  }

  private lockAll(): void {
    this.canvas.getObjects().forEach(obj => {
      obj.set({ selectable: false, evented: false, hasControls: false } as any);
    });
    this.canvas.discardActiveObject();
  }

  extractVariables(): void {
    const pattern = /\{\{([^}]+)\}\}/g;
    const found = new Set<string>();
    let match: RegExpExecArray | null;

    this.canvas.getObjects().forEach(obj => {
      if (obj.type === 'i-text' || obj.type === 'text') {
        const text = (obj as fabric.IText).text || '';
        while ((match = pattern.exec(text)) !== null) {
          found.add(`{{${match[1]}}}`);
        }
        pattern.lastIndex = 0;
      }
    });

    // Also scan raw JSON for any missed objects
    try {
      const jsonObj = JSON.parse(this.templateJson);
      const jsonStr = JSON.stringify(jsonObj);
      while ((match = pattern.exec(jsonStr)) !== null) {
        found.add(`{{${match[1]}}}`);
      }
    } catch {}

    this.variables = Array.from(found).map(p => ({ placeholder: p, value: '' }));
  }

  addCustomVariable(): void {
    const key = this.newVarKey.trim();
    if (!key) return;
    const placeholder = key.startsWith('{{') ? key : `{{${key}}}`;
    if (!this.variables.find(v => v.placeholder === placeholder)) {
      this.variables.push({ placeholder, value: '' });
    }
    this.newVarKey = '';
  }

  removeVariable(index: number): void {
    this.variables.splice(index, 1);
  }

  applyVariables(): void {
    if (!this.templateJson) return;

    let resolvedJson = this.templateJson;
    this.variables.forEach(v => {
      // Escape special regex chars in placeholder
      const escaped = v.placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, 'g');
      resolvedJson = resolvedJson.replace(re, v.value || v.placeholder);
    });

    this.canvas.loadFromJSON(resolvedJson, () => {
      this.lockAll();
      this.canvas.renderAll();
      this.isApplied = true;
      this.showStatus('Variables applied. Ready to generate PDF.', 'success');
    });
  }

  resetPreview(): void {
    if (!this.templateJson) return;
    this.canvas.loadFromJSON(this.templateJson, () => {
      this.lockAll();
      this.canvas.renderAll();
      this.isApplied = false;
      this.showStatus('Reset to original template.', 'info');
    });
  }

  generatePdf(): void {
    this.isGenerating = true;

    const variableMap: Record<string, string> = {};
    this.variables.forEach(v => {
      const key = v.placeholder.replace(/^\{\{|\}\}$/g, '');
      variableMap[key] = v.value;
    });

    if (this.templateId !== null) {
      this.templateService.generatePdf(this.templateId, variableMap).subscribe({
        next: (blob) => {
          this.isGenerating = false;
          this.downloadBlob(blob, 'certificate.pdf');
          this.showStatus('PDF generated and downloaded.', 'success');
        },
        error: () => {
          this.isGenerating = false;
          this.fallbackExportPng();
        }
      });
    } else {
      // Backend not available — export canvas as PNG
      this.isGenerating = false;
      this.fallbackExportPng();
    }
  }

  private fallbackExportPng(): void {
    const dataUrl = this.canvas.toDataURL({ format: 'png', multiplier: 2 });
    const link = document.createElement('a');
    link.download = 'certificate.png';
    link.href = dataUrl;
    link.click();
    this.showStatus('Backend offline: exported as high-res PNG (2x). For PDF, start the backend.', 'info');
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  goBack(): void { this.router.navigate(['/authority']); }

  private showStatus(msg: string, type: 'success' | 'danger' | 'info'): void {
    this.statusMessage = msg;
    this.statusType = type;
    setTimeout(() => this.statusMessage = '', 6000);
  }

  get variablesComplete(): boolean {
    return this.variables.every(v => v.value.trim().length > 0);
  }
}
