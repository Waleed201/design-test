import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { fabric } from 'fabric';
import { TemplateService } from '../services/template.service';

interface LayerInfo {
  id: string;
  label: string;
  type: string;
  locked: boolean;
  object: fabric.Object;
}

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html'
})
export class AdminComponent implements AfterViewInit, OnDestroy {
  @ViewChild('fabricCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  canvas!: fabric.Canvas;
  layers: LayerInfo[] = [];
  bgOpacity = 1;
  templateName = 'My Certificate Template';
  selectedObject: fabric.Object | null = null;
  statusMessage = '';
  statusType: 'success' | 'danger' | 'info' = 'info';
  isSaving = false;
  private objectCounter = 0;

  commonVariables = ['{{trainee_name}}', '{{course_title}}', '{{date}}', '{{instructor}}', '{{certificate_no}}'];

  constructor(private templateService: TemplateService, private router: Router) {}

  ngAfterViewInit(): void {
    this.canvas = new fabric.Canvas(this.canvasRef.nativeElement, {
      width: 1000,
      height: 700,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true
    });

    this.canvas.on('selection:created', (e) => this.onSelectionChanged(e));
    this.canvas.on('selection:updated', (e) => this.onSelectionChanged(e));
    this.canvas.on('selection:cleared', () => { this.selectedObject = null; });
    this.canvas.on('object:added', () => this.refreshLayers());
    this.canvas.on('object:removed', () => this.refreshLayers());
    this.canvas.on('object:modified', () => this.refreshLayers());

    // Load saved template if exists
    const saved = this.templateService.loadLocal();
    if (saved?.fabricJson) {
      this.templateName = saved.name || this.templateName;
      this.canvas.loadFromJSON(saved.fabricJson, () => {
        this.canvas.renderAll();
        this.refreshLayers();
        this.showStatus('Loaded saved template.', 'info');
      });
    }
  }

  ngOnDestroy(): void {
    this.canvas?.dispose();
  }

  private onSelectionChanged(e: any): void {
    this.selectedObject = e.selected?.[0] || null;
  }

  private generateId(): string {
    return `obj_${++this.objectCounter}_${Date.now()}`;
  }

  refreshLayers(): void {
    this.layers = this.canvas.getObjects()
      .filter(o => !(o as any).isBackground)
      .map(o => ({
        id: (o as any).customId || '',
        label: (o as any).layerLabel || o.type || 'object',
        type: o.type || 'object',
        locked: !(o as any).selectable,
        object: o
      }));
  }

  // ── Background ─────────────────────────────────────────────────────────────

  onBgUpload(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target!.result as string;
      fabric.Image.fromURL(url, (img) => {
        img.scaleToWidth(1000);
        img.scaleToHeight(700);
        img.set({
          left: 0,
          top: 0,
          originX: 'left',
          originY: 'top',
          opacity: this.bgOpacity,
          selectable: false,
          evented: false
        } as any);
        (img as any).isBackground = true;
        this.canvas.setBackgroundImage(img as any, () => this.canvas.renderAll());
      });
    };
    reader.readAsDataURL(file);
  }

  onBgOpacityChange(): void {
    const bg = this.canvas.backgroundImage as fabric.Image;
    if (bg) {
      bg.set({ opacity: this.bgOpacity });
      this.canvas.renderAll();
    }
  }

  // ── Add objects ────────────────────────────────────────────────────────────

  addText(): void {
    const text = new fabric.IText('Double-click to edit', {
      left: 100,
      top: 100,
      fontFamily: 'Arial',
      fontSize: 28,
      fill: '#333333',
      fontWeight: 'normal'
    });
    (text as any).customId = this.generateId();
    (text as any).layerLabel = 'Text';
    this.canvas.add(text);
    this.canvas.setActiveObject(text);
    this.canvas.renderAll();
  }

  addVariable(variable: string): void {
    const text = new fabric.IText(variable, {
      left: 150,
      top: 150,
      fontFamily: 'Arial',
      fontSize: 32,
      fill: '#1a237e',
      fontWeight: 'bold'
    });
    (text as any).customId = this.generateId();
    (text as any).layerLabel = variable;
    (text as any).isVariable = true;
    this.canvas.add(text);
    this.canvas.setActiveObject(text);
    this.canvas.renderAll();
  }

  addRect(): void {
    const rect = new fabric.Rect({
      left: 200,
      top: 200,
      width: 200,
      height: 80,
      fill: 'transparent',
      stroke: '#007bff',
      strokeWidth: 2,
      rx: 4,
      ry: 4
    });
    (rect as any).customId = this.generateId();
    (rect as any).layerLabel = 'Rectangle';
    this.canvas.add(rect);
    this.canvas.setActiveObject(rect);
    this.canvas.renderAll();
  }

  addLine(): void {
    const line = new fabric.Line([50, 50, 500, 50], {
      left: 100,
      top: 300,
      stroke: '#333',
      strokeWidth: 2
    });
    (line as any).customId = this.generateId();
    (line as any).layerLabel = 'Line';
    this.canvas.add(line);
    this.canvas.setActiveObject(line);
    this.canvas.renderAll();
  }

  addImage(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target!.result as string;
      fabric.Image.fromURL(url, (img) => {
        img.scaleToWidth(150);
        img.set({ left: 200, top: 200 });
        (img as any).customId = this.generateId();
        (img as any).layerLabel = 'Image';
        this.canvas.add(img);
        this.canvas.setActiveObject(img);
        this.canvas.renderAll();
      });
    };
    reader.readAsDataURL(file);
  }

  // ── Lock / Unlock ──────────────────────────────────────────────────────────

  toggleLock(): void {
    const obj = this.canvas.getActiveObject();
    if (!obj) return;
    const locked = !(obj as any).selectable;
    this.setLock(obj, !locked);
    this.canvas.discardActiveObject();
    this.canvas.renderAll();
    this.refreshLayers();
  }

  private setLock(obj: fabric.Object, lock: boolean): void {
    obj.set({
      selectable: !lock,
      evented: !lock,
      hasControls: !lock,
      hasBorders: !lock,
      lockMovementX: lock,
      lockMovementY: lock
    } as any);
    (obj as any).adminLocked = lock;
  }

  toggleLayerLock(layer: LayerInfo): void {
    this.setLock(layer.object, !layer.locked);
    this.canvas.renderAll();
    this.refreshLayers();
  }

  selectLayer(layer: LayerInfo): void {
    if (layer.locked) return;
    this.canvas.setActiveObject(layer.object);
    this.canvas.renderAll();
  }

  deleteSelected(): void {
    const obj = this.canvas.getActiveObject();
    if (!obj) return;
    this.canvas.remove(obj);
    this.canvas.renderAll();
  }

  bringForward(): void {
    const obj = this.canvas.getActiveObject();
    if (obj) { this.canvas.bringForward(obj); this.refreshLayers(); }
  }

  sendBackward(): void {
    const obj = this.canvas.getActiveObject();
    if (obj) { this.canvas.sendBackwards(obj); this.refreshLayers(); }
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  saveTemplate(): void {
    this.isSaving = true;
    const json = JSON.stringify(this.canvas.toJSON([
      'customId', 'layerLabel', 'isVariable', 'isBackground', 'adminLocked'
    ]));
    const template = { name: this.templateName, fabricJson: json };
    this.templateService.saveLocal(template);

    this.templateService.saveTemplate(template).subscribe({
      next: (saved) => {
        this.isSaving = false;
        this.showStatus(`Template saved (ID: ${saved.id}). Proceed to Authority stage.`, 'success');
      },
      error: () => {
        this.isSaving = false;
        this.showStatus('Saved locally (backend offline). Proceed to Authority stage.', 'info');
      }
    });
  }

  goToAuthority(): void {
    this.router.navigate(['/authority']);
  }

  private showStatus(msg: string, type: 'success' | 'danger' | 'info'): void {
    this.statusMessage = msg;
    this.statusType = type;
    setTimeout(() => this.statusMessage = '', 4000);
  }

  get isObjectSelected(): boolean {
    return !!this.canvas?.getActiveObject();
  }

  get selectedIsLocked(): boolean {
    const obj = this.canvas?.getActiveObject();
    return obj ? !(obj as any).selectable : false;
  }
}
