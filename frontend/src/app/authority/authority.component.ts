import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { fabric } from 'fabric';
import { TemplateService } from '../services/template.service';

@Component({
  selector: 'app-authority',
  templateUrl: './authority.component.html'
})
export class AuthorityComponent implements AfterViewInit, OnDestroy {
  @ViewChild('fabricCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  canvas!: fabric.Canvas;
  signaturePreviewUrl: string | null = null;
  signaturePlaced = false;
  statusMessage = '';
  statusType: 'success' | 'danger' | 'info' = 'info';
  isExporting = false;
  templateLoaded = false;
  sigX = 700;
  sigY = 580;
  sigWidth = 200;

  constructor(private templateService: TemplateService, private router: Router) {}

  ngAfterViewInit(): void {
    this.canvas = new fabric.Canvas(this.canvasRef.nativeElement, {
      width: 1000,
      height: 700,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true
    });

    const saved = this.templateService.loadLocal();
    if (saved?.fabricJson) {
      this.canvas.loadFromJSON(saved.fabricJson, () => {
        this.enforceAdminLocks();
        this.canvas.renderAll();
        this.templateLoaded = true;
        this.showStatus('Template loaded. Admin-locked layers are protected.', 'info');
      });
    } else {
      this.showStatus('No template found. Please complete the Admin stage first.', 'danger');
    }
  }

  ngOnDestroy(): void {
    this.canvas?.dispose();
  }

  private enforceAdminLocks(): void {
    this.canvas.getObjects().forEach(obj => {
      if ((obj as any).adminLocked) {
        obj.set({
          selectable: false,
          evented: false,
          hasControls: false,
          hasBorders: false,
          lockMovementX: true,
          lockMovementY: true
        } as any);
      }
    });
  }

  // ── Signature ──────────────────────────────────────────────────────────────

  onSignatureUpload(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.includes('image')) {
      this.showStatus('Please upload an image file (PNG recommended for transparency).', 'danger');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target!.result as string;
      this.signaturePreviewUrl = url;

      fabric.Image.fromURL(url, (img) => {
        img.scaleToWidth(this.sigWidth);
        img.set({
          left: this.sigX,
          top: this.sigY,
          opacity: 0.9
        });
        (img as any).customId = 'authority_signature';
        (img as any).layerLabel = 'Authority Signature';
        (img as any).isSignature = true;

        // Remove previous signature if exists
        const existing = this.canvas.getObjects().find(o => (o as any).isSignature);
        if (existing) this.canvas.remove(existing);

        this.canvas.add(img);
        this.canvas.setActiveObject(img);
        this.canvas.renderAll();
        this.signaturePlaced = true;
        this.showStatus('Signature placed. You can drag it to reposition.', 'success');
      });
    };
    reader.readAsDataURL(file);
  }

  removeSignature(): void {
    const sig = this.canvas.getObjects().find(o => (o as any).isSignature);
    if (sig) {
      this.canvas.remove(sig);
      this.canvas.renderAll();
    }
    this.signaturePreviewUrl = null;
    this.signaturePlaced = false;
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  exportToProgram(): void {
    this.isExporting = true;
    const json = JSON.stringify(this.canvas.toJSON([
      'customId', 'layerLabel', 'isVariable', 'isBackground', 'adminLocked', 'isSignature'
    ]));

    const template = { name: this.templateService.loadLocal()?.name || 'Certificate', fabricJson: json };
    this.templateService.saveLocal(template);

    this.templateService.saveTemplate(template).subscribe({
      next: (saved) => {
        this.isExporting = false;
        this.showStatus(`Signed template saved (ID: ${saved.id}). Proceed to Program stage.`, 'success');
        setTimeout(() => this.router.navigate(['/program']), 1500);
      },
      error: () => {
        this.isExporting = false;
        this.showStatus('Saved locally (backend offline). Proceeding to Program stage.', 'info');
        setTimeout(() => this.router.navigate(['/program']), 1500);
      }
    });
  }

  goBack(): void { this.router.navigate(['/admin']); }
  goNext(): void { this.router.navigate(['/program']); }

  private showStatus(msg: string, type: 'success' | 'danger' | 'info'): void {
    this.statusMessage = msg;
    this.statusType = type;
    setTimeout(() => this.statusMessage = '', 5000);
  }
}
