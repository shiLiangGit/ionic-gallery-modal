import { Component, OnInit, OnDestroy, Input, Output, ViewChild, EventEmitter } from '@angular/core';
import { ViewController, Gesture, Scroll } from 'ionic-angular';

@Component({
  selector: 'zoomable-image',
  templateUrl: 'zoomable-image.html',
  styleUrls: ['./zoomable-image.scss'],
})
export class ZoomableImage implements OnInit, OnDestroy {
  @ViewChild('image') image;
  @ViewChild('container') container;
  @ViewChild('ionScrollContainer') ionScrollContainer: Scroll;

  @Input() src: string;

  @Output() disableScroll = new EventEmitter();
  @Output() enableScroll = new EventEmitter();

  private scrollableElement: HTMLElement;
  private scrollListener: any;

  private gesture: Gesture;
  private scale: number = 1;
  private scaleStart: number = 1;

  private maxScale: number = 3;
  private minScale: number = 1;
  private minScaleBounce: number = 0.2;
  private maxScaleBounce: number = 0.35;

  private imageWidth: number = 0;
  private imageHeight: number = 0;

  private position: any = {
    x: 0,
    y: 0,
  };
  private scroll: any = {
    x: 0,
    y: 0,
  };
  private centerRatio: any = {
    x: 0,
    y: 0,
  };
  private centerStart: any = {
    x: 0,
    y: 0,
  };

  public ngOnInit() {
    // Get the image dimensions
    this.getImageDimensions();

    // Get the scrollable element
    this.scrollableElement = this.ionScrollContainer['_elementRef'].nativeElement.querySelector('.scroll-content');

    // Attach events
    this.attachEvents();
  }

  public ngOnDestroy() {
    this.scrollableElement.removeEventListener('scroll', this.scrollListener);
  }

  /**
   * Attach the events to the items
   */
  private attachEvents() {
    // Gesture events
    this.gesture = new Gesture(this.container.nativeElement);
    this.gesture.listen();
    this.gesture.on('doubletap', e => this.doubleTapEvent(e));
    this.gesture.on('pinch', e => this.pinchEvent(e));
    this.gesture.on('pinchstart', e => this.pinchStartEvent(e));
    this.gesture.on('pinchend', e => this.pinchEndEvent(e));

    // Scroll event
    this.scrollListener = this.scrollEvent.bind(this);
    this.scrollableElement.addEventListener('scroll', this.scrollListener);
}

  /**
   * Get the real image dimensions and other useful stuff
   */
  private getImageDimensions() {
    let _this = this;
    let image = new Image();
    image.onload = function () {
      if (this.width / this.height > window.innerWidth / window.innerHeight) {
        _this.imageWidth = window.innerWidth;
        _this.imageHeight = this.height / this.width * window.innerWidth;
      } else {
        _this.imageHeight = window.innerHeight;
        _this.imageWidth = this.width / this.height * window.innerHeight;
      }

      _this.maxScale = Math.max(this.width / _this.imageWidth - _this.maxScaleBounce, 1.5);
      _this.image.nativeElement.style.width = `${_this.imageWidth}px`;
      _this.image.nativeElement.style.height = `${_this.imageHeight}px`;

      _this.displayScale();
    };
    image.src = this.src;
  }

  /**
   * While the user is pinching
   *
   * @param  {Event} event
   */
  private pinchEvent(event) {
    let scale = this.scaleStart * event.scale;

    if (scale > this.maxScale) {
      scale = this.maxScale + (1 - this.maxScale / scale) * this.maxScaleBounce;
    } else if (scale < this.minScale) {
      scale = this.minScale - (1 - scale / this.minScale) * this.minScaleBounce;
    }

    this.scale = scale;
    this.displayScale();

    event.preventDefault();
  }

  /**
   * When the user starts pinching
   *
   * @param  {Event} event
   */
  private pinchStartEvent(event) {
    this.scaleStart = this.scale;
    this.setCenter(event);
  }

  /**
   * When the user stops pinching
   *
   * @param  {Event} event
   */
  private pinchEndEvent(event) {
    this.checkScroll();

    if (this.scale > this.maxScale) {
      this.animateScale(this.maxScale);
    } else if (this.scale < this.minScale) {
      this.animateScale(this.minScale);
    }
  }

  /**
   * When the user double taps on the photo
   *
   * @param  {Event} event
   */
  private doubleTapEvent(event) {
    this.setCenter(event);

    let scale = this.scale > 1 ? 1 : 2.5;
    if (scale > this.maxScale) {
      scale = this.maxScale;
    }

    this.animateScale(scale);
    this.checkScroll();
  }

  /**
   * When the user is scrolling
   *
   * @param  {Event} event
   */
  private scrollEvent(event) {
    this.scroll.x = event.target.scrollLeft;
    this.scroll.y = event.target.scrollTop;
  }

  /**
   * Set the startup center calculated on the image (along with the ratio)
   *
   * @param  {Event} event
   */
  private setCenter(event) {
    const realImageWidth = this.imageWidth * this.scale;
    const realImageHeight = this.imageHeight * this.scale;

    this.centerStart.x = Math.max(event.center.x - this.position.x * this.scale, 0);
    this.centerStart.y = Math.max(event.center.y - this.position.y * this.scale, 0);

    this.centerRatio.x = Math.min((this.centerStart.x + this.scroll.x) / realImageWidth, 1);
    this.centerRatio.y = Math.min((this.centerStart.y + this.scroll.y) / realImageHeight, 1);
  }

  /**
   * Set the scroll of the ion-scroll
   */
  private setScroll() {
    this.scrollableElement.scrollLeft = this.scroll.x;
    this.scrollableElement.scrollTop = this.scroll.y;
  }

  /**
   * Calculate the position and set the proper scale to the element and the
   * container
   */
  private displayScale() {
    const realImageWidth = this.imageWidth * this.scale;
    const realImageHeight = this.imageHeight * this.scale;

    this.position.x = Math.max((window.innerWidth - realImageWidth) / (2 * this.scale), 0);
    this.position.y = Math.max((window.innerHeight - realImageHeight) / (2 * this.scale), 0);

    this.image.nativeElement.style.transform = `scale(${this.scale}) translate(${this.position.x}px, ${this.position.y}px)`;
    this.container.nativeElement.style.width = `${realImageWidth}px`;
    this.container.nativeElement.style.height = `${realImageHeight}px`;

    this.scroll.x = this.centerRatio.x * realImageWidth - this.centerStart.x;
    this.scroll.y = this.centerRatio.y * realImageWidth - this.centerStart.y;
    this.setScroll();
  }

  /**
   * Check wether to disable or enable scroll and then call the events
   */
  private checkScroll() {
    if (this.scale > 1) {
      this.disableScroll.emit({});
    } else {
      this.enableScroll.emit({});
    }
  }

  /**
   * Animates to a certain scale (with ease)
   *
   * @param  {number} scale
   */
  private animateScale(scale:number = 1) {
    this.scale += (scale - this.scale) / 5;

    if (Math.abs(this.scale - scale) <= 0.1) {
      this.scale = scale;
    }

    this.displayScale();

    if (Math.abs(this.scale - scale) > 0.1) {
      window.requestAnimationFrame(this.animateScale.bind(this, scale));
    }
  }
}
