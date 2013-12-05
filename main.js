// based on Rob Hawkes's twitter-canvas-10k 
// https://github.com/robhawkes/twitter-canvas-10k

$(function() {
	var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	
	var requester;
	var blobs;
	
	var wrapper = $('#w');
	var details = $('#d');	
	var blob = $('#b');
	var name = $('#n');
	var meta = $('#me');
	
	var mask = $('#m');
	var startWrapper = $('#sw');
	
	var canvas = $("#c");
	var canvasHeight;
	var canvasWidth;
	var ctx;
	var dt = 0.1;
	
	var boundary;
	var pointCollection = new PointCollection();
	
	var firstStart = true;
	
	// Brazil, by gabri_ferlin (http://kuler.adobe.com/#themeID/1703776)
	var PALETTE = [[0x8F, 0xBF, 0x4D], [0xD9, 0x59, 0x29], [0x0D, 0x8C, 0x7F], [0xF2, 0xD1, 0x3E], [0x06,0x35, 0x59]];
	
	function init() {
		requester = new Requester();
		requester.getBlobs();
		
		addContactInfo();
		
		updateCanvasDimensions();
		
		boundary = new Boundary(0, 0, canvasWidth, canvasHeight);
		
		initEventListeners();
		timeout();
	};
	
	function addContactInfo() {
		$('#s').append('<p><a href="mai' + 'lto:stei' + 'nbro@po' + 
	                 'st.harvar' + 'd.edu' + '">stei' + 'nbro@pos' + 
	                 't.harv' + 'ard.edu</a></p>');
	}
	
	function initEventListeners() {
		$(window).bind('resize', updateCanvasDimensions).bind('keyup', onKeyUp).bind('mousemove', onMove);
		$(canvas).add('#w').bind('click', onClick);
		$(canvas).add('#sw').bind('click', onClick);
		
		$(document).bind('onBlobsReceived', function(e) {
			entries = e.blobs;
			
			by_age = entries.sort(function(a,b) { return a.age.getTime() - b.age.getTime(); });
			oldest = by_age[0];
			newest = by_age.reverse()[0];
			for (var i = 0; i < entries.length; i++) {
				var point = pointCollection.newPoint(Math.random()*canvasWidth, Math.random()*canvasHeight);
				point.data = entries[i];
				point.originalSize = point.size = (point.data.age - oldest.age) / (newest.age - oldest.age) * 40 + 10;
				palette = PALETTE[point.data.type]; //parseInt(Math.random()*PALETTE.length)]
				point.colour = {r: palette[0], g: palette[1], b: palette[2]};//{r: parseInt(Math.random()*256), g: parseInt(Math.random()*256), b: parseInt(Math.random()*256)}; //{r: 0xDD, g: 0xC8, b: 0x37};
			};
		});
		
		$(document).bind('onBlobsFinished', function(e) {
			mask.fadeOut(600);
		});
		
		$('#o').click(function(e) {
			startWrapper.fadeIn(500);
		});
	};
	
	function updateCanvasDimensions() {
		canvas.attr({height: ($(window).height() > 600) ? $(window).height() : '600', width: ($(window).width() > 740) ? $(window).width() : '740'});
		canvasWidth = canvas.width();
		canvasHeight = canvas.height();
		
		if (boundary)
			boundary.setBoundary(0, 0, canvasWidth, canvasHeight);
		
		draw();
	};
	
	function onKeyUp(e) {
		switch (e.keyCode) {
			case 32: // space
				hideWrapper();
				if (startWrapper.is(':hidden')) {
					startWrapper.fadeIn(500);
				} else {
					startWrapper.fadeOut(500);
				}
				break;
			case 27: // escape
				hideWrapper();
				if(!(startWrapper.is(':hidden')))
					startWrapper.fadeOut(500);
				break;
		};
	};
	
	function onMove(e) {
		if (pointCollection) {
			pointCollection.mousePos.set(e.pageX, e.pageY);
			if(pointCollection.selectPoint(e.pageX, e.pageY))
				canvas.css({cursor: 'pointer'});
			else
				canvas.css({cursor: 'default'});
		}
	};
	
	function onClick(e) {
		e.stopPropagation();
		
		if(!(startWrapper.is(':hidden')))
			startWrapper.fadeOut(500);
		
		pointCollection.selectedPoint = null;
		var point = pointCollection.selectPoint(e.pageX, e.pageY);
		
		if (point) {
			var data = point.data;
			name.html('<a href="' + data.link + '">' + data.title + '</a>');
			
			meta.html(months[data.age.getMonth()] + ' ' + data.age.getFullYear());
			
			blob.html(data.desc);
			if(!data.desc) blob.html(null);
			
			details.css('marginTop', (canvasHeight/2)-(details.height()/2));
			
			wrapper.css({visibility: 'visible', display: 'none'}).fadeIn(500);
		} else {
			hideWrapper();
		};
	};
	
	function hideWrapper() {
		wrapper.fadeOut(500, function() {
			$(this).css({visibility: 'hidden', display: 'block'});
		});
	}
	
	function timeout() {
		draw();
		update();
		
		setTimeout(function() { timeout() }, 30);
	};
	
	function draw() {
		var tmpCanvas = canvas.get(0);
		
		if (tmpCanvas.getContext == null) {
			return; 
		};
		
		ctx = tmpCanvas.getContext('2d');
		ctx.clearRect(0, 0, canvasWidth, canvasHeight);
		
		if (pointCollection)
			pointCollection.draw();
	};
	
	function update() {		
		if (pointCollection)
			pointCollection.update();
	};
	
	function Requester() {
		this.getBlobs = function() {
			// load SoundCloud uploads
			$.get("https://api.soundcloud.com/users/steinbro/tracks.json?client_id=385b6fca01820f205f2685dc162a02a8", function(response) {
				blobs = response.map(function(track) {
					return {
						age: new Date(track.created_at),
						title: track.title,
						link: track.permalink_url,
						type: 0
					}
				});
				$.event.trigger({type: 'onBlobsReceived', blobs: blobs});
			});
			
			// load GitHub repositories
			$.get("https://api.github.com/users/steinbro/repos", function(response) {
				blobs = response.map(function(repo) {
					return {
						age: new Date(repo.created_at),
						title: repo.name,
						link: repo.homepage || repo.html_url,
						desc: repo.description,
						type: 1
					};
				});
				$.event.trigger({type: 'onBlobsReceived', blobs: blobs });
				$.event.trigger({type: 'onBlobsFinished' });
			});
		};
	};
	
	function Vector(x, y) {
		this.x = x;
		this.y = y;
		
		this.addX = function(x) {
			this.x += x;
		};	
		this.addY = function(y) {
			this.y += y;
		};
		
		this.set = function(x, y) {
			this.x = x; 
			this.y = y;
		};
	};
	
	function Boundary(x, y, w, h) {
		this.left = x;
		this.right = w;
		this.top = y;
		this.bottom = h;
		
		this.setBoundary = function(x, y, w, h) {
			this.left = x;
			this.right = w;
			this.top = y;
			this.bottom = h;
		};
		
		this.collision = function(object) {
			var collide = false;
			var collideX = false;
			var collideY = false;
			
			if(object.curPos.x < this.left-object.size) {
				object.curPos.x = this.right+object.size; 
				
				collide = true;
				collideX = true;
			} else if(object.curPos.x > this.right+object.size) {
				object.curPos.x = this.left-object.size;
				
				collide = true;
				collideX = true;
			};
			
			if(object.curPos.y < this.top-object.size) {
				object.curPos.y = this.bottom+object.size;
				
				collide = true; 
				collideY = true;
			} else if(object.curPos.y > this.bottom+object.size) {
				object.curPos.y = this.top-object.size;
				
				collide = true; 
				collideY = true;
			};
			
			return {collide: collide, x: collideX, y: collideY}; 
		};
	};
	
	function PointCollection() {
		this.mousePos = new Vector(0, 0);
		this.points = new Array();
		
		this.newPoint = function(x, y) {
			var point = new Point(x, y);
			this.points.push(point);
			return point;
		};
		
		this.selectPoint = function(x, y) {
			var pointsLength = this.points.length;
			for (var i = 0; i < pointsLength; i++) {
				var point = this.points[i];
					
				if (point == null)
					continue;
						
				var dx = point.curPos.x - x;
				var dy = point.curPos.y - y;
				var dd = (dx * dx) + (dy * dy);
				var d = Math.sqrt(dd);
				
				if (d < point.size) {
					this.selectedPoint = point;
					return point;
				};
			};
		};
		
		this.update = function() {		
			var pointsLength = this.points.length;
			
			for (var i = 0; i < pointsLength; i++) {
				var point = this.points[i];
				
				if (point == null)
					continue;
					
				point.force = new Vector(0.0, 0.0);
			};
			
			for (var i = 0; i < pointsLength; i++) {
				var point = this.points[i];
				
				if (point == null)
					continue;
				
				var dx = this.mousePos.x - point.curPos.x;
				var dy = this.mousePos.y - point.curPos.y;
				var dd = (dx * dx) + (dy * dy);
				var d = Math.sqrt(dd);
				
				// grow small points when mouse approaches
				if (d < 100 && point.originalSize < 20) {
					var size = point.originalSize/(d/100);
					point.size = (size < 20) ? size : 20;
				} else {
					point.size = point.originalSize;
					point.opacity = point.originalOpacity;
				};
				
				if (d < 100)
					point.opacity = point.originalOpacity/(d/100);
				
				point.update();
			};
		};
		
		this.draw = function() {
			var pointsLength = this.points.length;
			for (var i = 0; i < pointsLength; i++) {
				var point = this.points[i];
				
				if (point == null)
					continue;
				
				point.draw();
			};
		};
	};
	
	function Point(x, y) {
		this.acceleration = new Vector(0.0, 0.0);
		this.colour = {r: 0, g: 0, b: 0};
		this.originalOpacity = 0.7;
		this.opacity = 0.7;
		this.curPos = new Vector(x, y);
		this.data = new Object();
		this.force = new Vector(0.0, 0.0);
		this.mass = 1.0;
		this.originalSize = 5;
		this.size = 5;
		this.velocity = new Vector(Math.random()*20-10, Math.random()*20-10);
		
		this.born = Date.now() - 1000 * Math.random();  // stagger breaths
		this.breathRate = 0.002 * Math.random() + 0.001;
		
		this.update = function() {
			boundary.collision(this);
		
			var dtdt = dt * dt;
			
			this.curPos.x += this.velocity.x * dt + this.acceleration.x / 2 * dtdt;
			this.curPos.y += this.velocity.y * dt + this.acceleration.y / 2 * dtdt;
			
			this.velocity.x += this.acceleration.x * dt / 2;
			this.velocity.y += this.acceleration.y * dt / 2;
			
			this.acceleration.x = this.force.x / this.mass;
			this.acceleration.y = this.force.y / this.mass;
			
			this.velocity.x += this.acceleration.x * dt / 2;
			this.velocity.y += this.acceleration.y * dt / 2;
			
			// breathing growth/shrinking is proportional to size
			this.size = this.originalSize * (1 + 0.05 * Math.sin(this.breathRate * (Date.now() - this.born)));
		};
		
		this.draw = function() {
			ctx.fillStyle = 'rgba('+this.colour.r+', '+this.colour.g+', '+this.colour.b+', '+this.opacity+')';
			ctx.beginPath();
			ctx.arc(this.curPos.x, this.curPos.y, this.size, 0, Math.PI*2, true);
			ctx.fill();
		};
	};
	
	init();
});
