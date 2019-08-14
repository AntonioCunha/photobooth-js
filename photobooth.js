/**
*
* Photobooth.js version 0.7-rsd2
*
* build Wed Aug 14 2019 14:05:26 GMT-0300 (Brasilia Standard Time)
*
* CSS
*/
window.addEventListener("load",function(){var s = document.createElement("link"); s.href="css/Photobooth.css"; s.type = "text/css"; s.rel = "stylesheet"; document.head.appendChild(s);},false);
/**
* JS
*/
Photobooth = function( container )
{
	/**
	* Make it jQuery friendlier
	*/
	if( container.length )
	{
		container = container[ 0 ];
	}

	var fGetUserMedia =
	(
		navigator.mediaDevices.getUserMedia ||
		navigator.getUserMedia ||
		navigator.webkitGetUserMedia ||
		navigator.mozGetUserMedia ||
		navigator.oGetUserMedia ||
		navigator.msieGetUserMedia ||
		false
	);
	/**
	* Image callback. Will be called when
	* the user clicks the trigger
	*
	* Receives the image as a dataURL string
	*/
	this.onImage = function(){};

	this.getHueOffset = function()
	{
		return hueOffset;
	};

	this.setHueOffset = function( h )
	{
		if( fCheckValue( h, "hue" ) ) hueOffset = h;
	};

	this.getBrightnessOffset = function()
	{
		return brightnessOffset;
	};

	this.setBrightnessOffset = function( b )
	{
		if( fCheckValue( b, "brightness" ) ) brightnessOffset = b;
	};

	this.getSaturationOffset = function()
	{
		return saturationOffset;
	};

	this.setSaturationOffset = function( s )
	{
		if( fCheckValue( s, "saturation" ) ) saturationOffset = s;
	};

	this.setCrop = function()
	{
		oResizeHandle.toggle();
		if( eCrop.className === "crop" )
		{
			eCrop.className = "crop selected";
		}
		else
		{
			eCrop.className = "crop";
		}
	};

	this.crop = function(x,y,width,height)
	{
		oResizeHandle.cropMove(x,y);
		oResizeHandle.cropResize(width,height);
	};

	/**
	* Closes the videostream, cancels the canvas drawing loop
	* and frees up the webcam. Use resume()
	* to continue
	*/
	this.pause = function()
	{
		if( bIsStopped === false )
		{
			bIsStopped = true;

			if( oStream && oStream.stop )
			{
				oStream.stop();
			}
			else
			{
				oStream.getTracks().forEach( track => track.stop() );
			}
		}
	};

	/**
	* Resumes video playback that had previously
	* been paused with pause().
	*/
	this.resume = function()
	{
		if( bIsStopped === true )
		{
			bIsStopped = false;
			fRequestWebcamAccess();
		}
	};

	/**
	* Destroys the photobooth. Closes the video stream,
	* cancels all outstanding frames and destroys
	* the DOM elements and eventlisteners.
	*/
	this.destroy = function()
	{
		this.pause();
		container.removeChild( ePhotobooth );
	};

	/**
	* Drawing every frame of a video onto
	* a canvas and performing some pixel
	* manipulation ( like Photobooth does )
	* works well in Chrome and Opera, but
	* crashes Firefox within seconds. Therefore the
	* Hue / saturation / Brightness sliders are turned
	* of in FF and the video tag is displayed directly.
	*
	* To reeanble the Sliders set this property to true
	*
	* FIXME: when forceHSB is on, the video gets wrong aspect ratio
	*        e.g. mobile camera on portrait position
	*/
	this.forceHSB = true;

	/**
	 * Flip Camera button
	 */
	this.flipCammera = true;

	/**
	* Default image format, image/jpeg is also
	* commonly supported
	*/ 
	this.mimeType = 'image/png';

	/**
	* image/jpeg quality, valid range is 0.0 to 1.0
	*/
	this.quality = 1;

	/**
	* True if the browser supports Webcam streams,
	* false if not
	*/
	this.isSupported = !! fGetUserMedia;

	/**
	* Resizes the Photobooth to the desired size.
	* Minimum for both width and height is 200px
	*/
	this.resize = function( width, height )
	{

	    if (height == 0) { // auto-height conserving aspect ratio when height is zero
	        height = eVideo.videoHeight / (eVideo.videoWidth / width);

	        if (isNaN(height)) {
                //Fix for firefox
	            height = width / (4 / 3);
	        }
	    }

		if( width < 200 || height < 200)
		{
			throw "Error: Not enough space for Photobooth. Min height / width is 200 px";
		}

		_width = width;
		_height = height;
		oResizeHandle.setMax( _width, _height );
		ePhotobooth.style.width = width + "px";
		ePhotobooth.style.height = height + "px";
		eInput.width = width;
		eInput.height = height;
		eOutput.width = width;
		eOutput.height = height;
		eVideo.width = width;
		eVideo.height = height;
	};

	this.capture = function () {
	/**
        * Flash
        */
		eBlind.className = "blind";
		eBlind.style.opacity = 1;
		setTimeout(function () { eBlind.className = "blind anim"; eBlind.style.opacity = 0; }, 50);

		var mData = {};
		if (oResizeHandle.isActive())
		{
			mData = oResizeHandle.getData();
		}
		else
		{
			if (bVideoOnly)
			{
				mData = {
					x: ((_width - eVideo.videoWidth) / 2),
					y: ((_height - eVideo.videoHeight) / 2),
					width: eVideo.videoWidth,
					height: eVideo.videoHeight
				};
			}
			else
			{
				mData = {
					x: 0,
					y: 0,
					width: _width,
					height: _height
				};
			}

		}

		var eTempCanvas = cE("canvas");

		eTempCanvas.width = mData.width;
		eTempCanvas.height = mData.height;

		if (bVideoOnly)
		{
			eTempCanvas.getContext("2d").drawImage(
				eVideo,
				Math.max(0, mData.x - ((_width - eVideo.videoWidth) / 2)),
				Math.max(mData.y - ((_height - eVideo.videoHeight) / 2)),
				mData.width,
				mData.height,
				0,
				0,
				mData.width,
				mData.height);
		}
		else
		{
			var oImageData = oOutput.getImageData(mData.x, mData.y, mData.width, mData.height);
			eTempCanvas.getContext("2d").putImageData(oImageData, 0, 0);
		}

		scope.onImage(eTempCanvas.toDataURL(scope.mimeType,scope.quality));
	};

	/****************************
	* Private Methods
	****************************/

	var fCancelBubble = function( e )
{
	e.stopPropagation(); 
	e.cancelBubble=true;
};

	var Drag = function( element )
{
	this.startX = 0;
	this.startY = 0;

	element.addEventListener( "mousedown", this, false );
};

/**
 * functionality implemented after instantiation.
 *
 * @param x = number // x coordinate of drag event
 * @param y = number // y coordinate of drag event
 */
Drag.prototype.onStart = function ( x, y ) {};
Drag.prototype.onMove = function ( x, y ) {};
Drag.prototype.onStop = function ( x, y ) {};

Drag.prototype.handleEvent = function ( event ) {
	this['fon'+event.type](event);
};

Drag.prototype.fonmousedown = function ( e )
{
	e.preventDefault();

	this.startX = e.clientX;
	this.startY = e.clientY;

	this.onStart( this.startX, this.startY );

	document.addEventListener( "mousemove", this, false );
	document.addEventListener( "mouseup", this, false );
};

Drag.prototype.fonmousemove = function( e )
{
	this.onMove( e.clientX - this.startX, e.clientY - this.startY );
};

Drag.prototype.fonmouseup = function( e )
{
	this.onStop( e.clientX - this.startX, e.clientY - this.startY );

	document.removeEventListener( "mousemove", this );
	document.removeEventListener( "mouseup", this );
};

	var Slider = function( eContainer, fOnChange )
{
	eContainer.innerHTML = '<div class="submenu"><div class="tip"></div><div class="slider"><div class="track"></div><div class="handle" style="left:50px"><div></div></div></div></div>';

	var pos = 50,
		left = 50,
		eHandle = eContainer.getElementsByClassName( "handle" )[0],
		background = eContainer.getElementsByClassName( "slider" )[0];

	var oHandleDrag = new Drag( eHandle );

	oHandleDrag.onMove = function( x )
	{
		fApplyX( pos + x );
	};

	oHandleDrag.onStop = function( x )
	{
		pos = left;
	};

	var fApplyX = function( x )
	{
		if( x > 0 && x < 100 )
		{
			left = x;
			eHandle.style.left = x + "px";
			fOnChange( ( x - 50 ) / 100 );
		}
	};

	var fOnBackgroundClick = function( e )
	{
		fApplyX( e.layerX );
		pos = left;
	};

	background.addEventListener( "click", fOnBackgroundClick, false );
	eHandle.addEventListener( "click", fCancelBubble, false );
};

	var ResizeHandle = function( eContainer, maxWidth, maxHeight )
{
	this.setMax = function( width, height )
	{
		maxWidth = width;
		maxHeight = height;
	};

	this.getData = function()
	{
		return {
			x: left,
			y: top,
			width: width,
			height: height
		};
	};

	this.cropMove = function( x, y )
	{
		if( x + width < maxWidth && x > 0 )
		{
			tempLeft = x;
			element.style.left = tempLeft + "px";
		}
		if( y + height < maxHeight && y > 0 )
		{
			tempTop = y;
			element.style.top = tempTop + "px";
		}
		left = tempLeft;
		top = tempTop;
	};

	this.cropResize = function( x, y )
	{
		if( left + x < maxWidth && x > 18 )
		{
			tempWidth = x;
			element.style.width = tempWidth + "px";

		}
		if( top + y  < maxHeight &&  y > 18 )
		{
			tempHeight = y;
			element.style.height = tempHeight + "px";
		}
		width = tempWidth;
		height = tempHeight;
	};
	
	this.isActive = function()
	{
		return isVisible;
	};
	this.toggle = function()
	{
		if( isVisible === false )
		{
			element.style.opacity = 1;
			isVisible = true;
		}
		else
		{
			element.style.opacity = 0;
			isVisible = false;
		}
	};

	var left = 30,
		top = 30,
		width = 100,
		height = 100,
		tempLeft = 30,
		tempTop = 30,
		tempWidth = 100,
		tempHeight = 100,
		isVisible = false,
		element = document.createElement( 'div' );

	element.className = 'resizehandle';
	element.innerHTML = '<div class="handle"><div></div></div>';

	eContainer.appendChild( element );

	/**
	* Dragging the frame
	*/
	var eHandle = element.getElementsByTagName( "div" )[ 0 ];
	var oHandleDrag = new Drag( eHandle );

	oHandleDrag.onMove = function( x, y )
	{
		if( left + x + width < maxWidth && left + x > 0 )
		{
			tempLeft = left + x;
			element.style.left = tempLeft + "px";
		}
		if( top + y + height < maxHeight && top + y > 0 )
		{
			tempTop = top + y;
			element.style.top = tempTop + "px";
		}
	};

	oHandleDrag.onStop = function()
	{
		left = tempLeft;
		top = tempTop;
	};

	/**
	* Resizing the frame
	*/
	var eResizeHandle = element.getElementsByTagName( "div" )[ 1 ];
	eResizeHandle.addEventListener( "mousedown", fCancelBubble, false );
	var oResizeDrag = new Drag( eResizeHandle );
	
	oResizeDrag.onMove = function( x, y )
	{
		if( left + x + width < maxWidth && width + x > 18 )
		{
			tempWidth = width + x;
			element.style.width = tempWidth + "px";

		}
		if( top + y + height < maxHeight && height + y > 18 )
		{
			tempHeight = height + y;
			element.style.height = tempHeight + "px";
		}
	};

	oResizeDrag.onStop = function()
	{
		width = tempWidth;
		height = tempHeight;
	};
	
};


	var hueOffset = 0,
		saturationOffset = 0,
		brightnessOffset = 0,
		bVideoOnly = false,
		bIsStopped = false,
		oStream = null,
		scope = this,
		_width = container.offsetWidth === 0 ? $(container).width() : container.offsetWidth,
		_height = container.offsetHeight === 0 ? $(container).height() :container.offsetHeight;

	var fCheckValue = function( val, type )
	{
		if( val < -0.5 || val > 0.5 )
		{
			throw "Invalid value: " + type + " must be between 0 and 1";
		}
		else
		{
			return true;
		}
	};

	var fGetAnimFrame =
	(
		window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		window.msRequestAnimationFrame ||
		function( callback ){ window.setTimeout(callback, 1000 / 60);}
	);

	var c = function( n ){ return ePhotobooth.getElementsByClassName( n )[ 0 ]; };
	var cE = function( s ){ return document.createElement( s ); };

	var ePhotobooth = cE( "div" );
	ePhotobooth.className = "photobooth";
	ePhotobooth.innerHTML = '<div class="blind"></div><canvas></canvas><div class="warning notSupported">Sorry, Photobooth.js is not supported by your browser</div><div class="warning noWebcam">Please give Photobooth permission to use your Webcam. <span>Try again</span></div><ul><li title="flip"class="flip"></li><li title="hue"class="hue"></li><li title="saturation"class="saturation"></li><li title="brightness"class="brightness"></li><li title="crop"class="crop"></li><li title="take picture"class="trigger"></li></ul>';

	var eInput = cE( "canvas" );
	var oInput = eInput.getContext( "2d" );

	var eOutput = ePhotobooth.getElementsByTagName( "canvas" )[ 0 ];
	var oOutput = eOutput.getContext( "2d" );

	var eVideo = cE( "video" );
	eVideo.autoplay = true;
	
	var eNoWebcamWarning = c( "noWebcam" );
	eNoWebcamWarning.getElementsByTagName( "span" )[ 0 ].onclick = function(){ fRequestWebcamAccess(); };

	new Slider( c( "hue" ), function( value ){ hueOffset = value; });
	new Slider( c( "saturation" ), function( value ){ saturationOffset = value; });
	new Slider( c( "brightness" ), function( value ){ brightnessOffset = value; });

	var oResizeHandle = new ResizeHandle( ePhotobooth, _width, _height );

	var eCrop = c( "crop" );
	eCrop.onclick = function()
	{
		oResizeHandle.toggle();

		if( eCrop.className === "crop" )
		{
			eCrop.className = "crop selected";
		}
		else
		{
			eCrop.className = "crop";
		}
	};

	var eBlind = c( "blind" );

	c( "trigger" ).onclick = function()
	{
		this.capture();
	};

	var fFlipFront = false;
	var eFlip = c( "flip" );
	eFlip.onclick = function()
	{
		fFlipFront = ! fFlipFront;
		this.pause();
		this.resume();
	};

	var fOnStream = function( stream )
	{
		oStream = stream;
		fFixClasses();
		if ( typeof eVideo.srcObject === "object" )
		{
			eVideo.srcObject = oStream;
			if( scope.forceHSB === false )
			{
				bVideoOnly = true;
				ePhotobooth.appendChild( eVideo );
			}
			else
			{
				eVideo.addEventListener( "canplay", function(){ fGetAnimFrame( fNextFrame ); }, false );
			}

			eVideo.play();
		}
		else
		{
			/**
			 * Legacy support
			 */
			try{
				/**
				 * Chrome
				 */
				eVideo.src = ( window.URL || window.webkitURL ).createObjectURL( oStream );
				fGetAnimFrame( fNextFrame );
			}
			catch( e )
			{
				/**
				 * Firefox
				 */
				eVideo.mozSrcObject  =   oStream ;

				if( scope.forceHSB === false )
				{
					bVideoOnly = true;
					ePhotobooth.appendChild( eVideo );
				}
				else
				{
					eVideo.addEventListener( "canplay", function(){ fGetAnimFrame( fNextFrame ); }, false );
				}

				eVideo.play();
			}
		}
	};

	var fOnStreamError = function( e )
	{
		eNoWebcamWarning.style.display = "block";
	};

	var fRequestWebcamAccess = function()
	{
		/**
		 * FIXME: test identification thru videoTracks
		 * var videoTracks = stream.getVideoTracks();
		 * console.log('Using video device: ' + videoTracks[0].label);
		 */

		var constraints = {"video" : { facingMode: (fFlipFront? "user" : "environment") } };
		eNoWebcamWarning.style.display = "none";
		if ( navigator.mediaDevices.getUserMedia )
			navigator.mediaDevices.getUserMedia( constraints ).then( fOnStream ).catch( fOnStreamError );
		else
			fGetUserMedia.call( navigator, constraints, fOnStream, fOnStreamError );
	};

	var fFixClasses = function()
	{
		if( scope.forceHSB === false )
		{
			ePhotobooth.getElementsByTagName( "ul" )[ 0 ].classList.add("noHSB");
		}
		if ( scope.flipCammera === false )
		{
			ePhotobooth.getElementsByTagName( "ul" )[ 0 ].classList.add("noFlip");
		}
	};

	var fHue2rgb = function (p, q, t)
	{
		if(t < 0) t += 1;
		if(t > 1) t -= 1;
		if(t < 1/6) return p + (q - p) * 6 * t;
		if(t < 1/2) return q;
		if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
		return p;
	};

	var fWrap = function( v )
	{
		if( v > 1 ) return v - 1;
		if( v < 0 ) return 1 + v;
		return v;
	};

	var fCap = function( v )
	{
		if( v > 1 ) return 1;
		if( v < 0 ) return 0;
		return v;
	};

	var fNextFrame = function()
	{
		try
		{
			oInput.drawImage( eVideo, 0, 0, _width, _height );
		}
		catch(e){}
		var oImgData = oInput.getImageData( 0, 0, _width, _height );
		var pData = oImgData.data;

		for( var i = 0; i < pData.length; i += 4 )
		{
			/**
			* Time for some serious Math. Thanks to MJIJACKSON
			* for providing a great starting point
			*
			* http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
			*/
			var r = pData[ i ] / 255,
				g = pData[ i + 1 ] / 255,
				b = pData[ i + 2 ] / 255;
			 
			var max = Math.max(r, g, b),
				min = Math.min(r, g, b);

			var h, s, l = (max + min) / 2;

			if(max == min)
			{
				h = s = 0; // achromatic
			}
			else
			{
				var d = max - min;
				s = l > 0.5 ? d / ( 2 - max - min ) : d / ( max + min );
				
				if( max === r ) h = ( ( g - b ) / d + ( g < b ? 6 : 0 ) ) / 6;
				if( max === g ) h = ( ( b - r ) / d + 2 ) / 6;
				if( max === b ) h = ( ( r - g ) / d + 4 ) / 6;
			}

			h = fWrap( h + hueOffset );
			s = fCap( s + saturationOffset );
			l = fCap( l + brightnessOffset );

			if(s === 0)
			{
				r = g = b = l; // achromatic
			}
			else
			{
				var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
				var p = 2 * l - q;
				r = fHue2rgb( p, q, h + 1/3 );
				g = fHue2rgb( p, q, h );
				b = fHue2rgb( p, q, h - 1/3 );
			}

			pData[ i ] = r * 255;
			pData[ i + 1 ] = g * 255;
			pData[ i + 2 ] = b * 255;
		}

		oOutput.putImageData( oImgData, 0, 0 );
		
		if( bIsStopped === false )
		{
			fGetAnimFrame( fNextFrame );
		}
		
	};

	fFixClasses();
	this.resize( _width, _height );
	container.appendChild( ePhotobooth );

	if( fGetUserMedia )
	{
		/**
		* Startup
		*/
		fGetAnimFrame( fRequestWebcamAccess );
	}
	else
	{
		c( "notSupported" ).style.display = "block";
	}
};

/**
* jQuery integration. (It's safe to delete this line if you're not using jQuery)
*/
if( window.jQuery )
{
	$.fn.photobooth = function()
	{
		return this.each(function( i, container ) {
			var oPhotobooth = new Photobooth( container );
			$( container ).data( "photobooth", oPhotobooth );
			oPhotobooth.onImage = function( sDataUrl )
			{
				$( container ).trigger( "image", sDataUrl );
			};
		});
	};
}
