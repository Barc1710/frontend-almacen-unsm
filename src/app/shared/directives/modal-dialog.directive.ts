import { DOCUMENT } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, inject, OnDestroy } from '@angular/core';

/** Native modal behavior: initial focus, inert background and focus restoration. */
@Directive({
  selector: 'dialog[appModalDialog]',
  host: { '(cancel)': '$event.preventDefault()' },
})
export class ModalDialogDirective implements AfterViewInit, OnDestroy {
  private readonly element = inject<ElementRef<HTMLDialogElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private previousFocus: HTMLElement | null = null;

  ngAfterViewInit(): void {
    this.previousFocus = this.document.activeElement as HTMLElement | null;
    this.element.nativeElement.showModal();
  }

  ngOnDestroy(): void {
    this.element.nativeElement.close();
    if (this.previousFocus?.isConnected) this.previousFocus.focus();
  }
}
