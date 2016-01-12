var user_graph = user_graph || {};

user_graph.Wait = function(container) {
    this.container = container;
    this.timer_id = 0;
    this.rotation = 0;
    this.load_finished = false;
}

user_graph.Wait.prototype.draw = function () {
    var wait = this.container.select('#wait');
    wait.selectAll('*').remove();
    for(var ii = 0; ii < 12; ++ii) {
	var fillcol = 50 + ii * 15;
	var fill = 'rgba(' + fillcol + ',' + fillcol + ',' + fillcol + ',0.7)';
	wait.append('g')
	    .attr('transform', 'rotate(' + (this.rotation + ii*30) + ')')
	    .append('rect')
	    .attr('x', -5).attr('y', 40)
	    .attr('width', 10).attr('height', 70)
	    .attr('rx', 5).attr('ry', 5)
	    .style('fill', fill)
	    .style('stroke-width', '3')
	    .style('stroke', 'rgb(50, 50, 50)');
    }
    this.rotation += 30;
    
    if(this.load_finished) {
	this.rotation = 0;
	this.load_finished = false;
	clearInterval(this.timer_id);
	return true;
    }
	return false;
}
    
user_graph.Wait.prototype.show = function() {
    width = this.container.attr('width');
    height = this.container.attr('height');
    this.container.append('rect')
	.attr('x', 0).attr('y', 0)
	.attr('width', width).attr('height',height)
	.attr('id', 'wait-grey')
	.style('fill', 'rgba(45, 62, 80, 0.8)');
    this.container.append('g')
	.attr('transform', 'translate(' + (width/2) + ',' + (height/2) + ')')
	.attr('id', 'wait');
    var that = this;
    this.timer_id = setInterval(function() { that.draw(); }, 100);
}

user_graph.Wait.prototype.hide = function() {
    this.load_finished = true;
    this.container.select('#wait-grey').remove();
    this.container.select('#wait').remove();
}


// Create a graph
// Params:
//   - div - the parent html <div> element to hold the graph
//   - margin - { top, bottom, left, right }
//   - accessors - { x, y, z }, each a function(d) returning the given axis value
//   - scales - { x, y } should be d3.scale.* object (log, linear etc)
//   - labels - { x, y } the axis labels to display
//   - tooltip - a function(d) returning toolip text
//   - highlight_factor - a line y = x * highlight_factor is drawn on the chart if this is defined
//   - legend_override - { domain, range } override the automatic legend generation
user_graph.Graph = function(div, margin, accessors, scales, labels, tooltip, highlight_factor, legend_override) {
    if(typeof(highlight_factor) == 'undefined')
	this.highlight_factor = 0;
    else
	this.highlight_factor = highlight_factor;

    this.margin = margin;
    this.accessors = accessors;
    this.labels = labels;
    this.tooltip = tooltip;

    this.size = { width: 1000, height: 600 };
    this.plot_size = {
	width: this.size.width - margin.left - margin.right,
	height: this.size.height - margin.top - margin.bottom
    };

    this.scales = scales;
    scales.x.range([0, this.plot_size.width]);
    scales.y.range([this.plot_size.height, 0]);

    var that = this;

    this.map = {
	x: function(d) { return that.scales.x(that.accessors.x(d)); },
	y: function(d) { return that.scales.y(that.accessors.y(d)); },
	z: function(d) {
	    if(typeof(that.prefix) != "undefined") {
		if(sessionStorage.getItem(that.prefix + "_visited_" + d['user_name'])) {
		    return "rgba(150, 120, 231, 1)";
		}
	    }
	    return "rgba(0, 120, 231, 1)";
	}
    };
    if(this.scales.z)
	this.map.z = function(d) { return that.scales.z(that.accessors.z(d)); };

    this.axes = {
	x: d3.svg.axis().scale(this.scales.x).orient("bottom"),
	y: d3.svg.axis().scale(this.scales.y).orient("left")
    };
    this.axes.x.ticks(10, '.0f');
    this.axes.y.ticks(10, '.0f');

    this.container = div.append("svg")
	.attr("width", this.size.width) // this is used by the wait drawing
	.attr("height", this.size.height) // this is used by the wait drawing
	.attr("viewBox", "0 0 " + this.size.width + " " + this.size.height)
	.style("width", "100%")
	.style("height", "100%");

    this.wait = new user_graph.Wait(this.container);

    this.ec_bins = [ { count: 100, color: "#ff0000"},
		     { count: 200, color: "#ff5000"},
		     { count: 500, color: "#ffa000"},
		     { count: 1000, color: "#ffff00"},
		     { count: 2000, color: "#a0ff00"},
		     { count: 5000, color: "#50ff00"}
		   ];
    
    if(this.scales.z) {
	var legend = this.container.append("g")
	    .attr("transform", "translate(" + 1000 + ", 0)")
	    .attr("class", "legend");
	legend.append("text")
	    .attr("class", "label")
	    .attr("dy", ".72em")
	    .style("text-anchor", "end")
	    .text(this.labels.z);
	offset = 30;
	var legendItem = function(text, colour, offset, legend) {
	    item = legend.append("g").attr("transform", "translate(-100, " + offset + ")");
	    item.append("rect")
		.attr("style", "fill:" + colour + ";stroke-width:1;stroke:#000000")
		.attr("width", "20").attr("height", "20")
	    item.append("text")
		.attr("dy", "1em")
		.attr("dx", "30")
		.text(text);
	};

	if(legend_override) {
	    var domain = legend_override.domain;
	    var range = legend_override.range;

	    for(var ii = 0; ii < domain.length; ii++) {
		legendItem(domain[ii], range[ii], offset, legend);
		offset += 30;
	    }
	} else {
	    var domain = this.scales.z.domain();
	    var range = this.scales.z.range();

	    for(var ii = 0; ii < domain.length; ii++) {
		legendItem("< " + domain[ii], range[ii], offset, legend);
		offset += 30;
	    }
	    legendItem(domain[domain.length-1] + "+", range[domain.length], offset, legend);
	}
    }

    this.svg = this.container.append("g")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    this.tooltip_container = d3.select("body").append("div")
	.attr("class", "tooltip")
	.style("opacity", 0);

}

user_graph.Graph.prototype.draw = function(data) {
    var domain_min = function(data, acc) {
	min = d3.min(data, acc);
	if(min > 1 || min < 0)
	    return min - 1;
	return min;
    }
    this.scales.x.domain([domain_min(data, this.accessors.x), d3.max(data, this.accessors.x)+1]);
    this.scales.y.domain([d3.min(data, this.accessors.y), d3.max(data, this.accessors.y)]);

    this.svg.selectAll("*").remove();

    this.svg.append('g')
	.attr('class', 'x axis')
        .attr('transform', 'translate(0,' + this.plot_size.height + ')')
        .call(this.axes.x)
       .append('text')
        .attr('class', 'label')
        .attr('x', this.plot_size.width)
        .attr('y', -6)
        .style('text-anchor', 'end')
        .text(this.labels.x);
    this.svg.append('g')
        .attr('class', 'y axis')
        .call(this.axes.y)
       .append('text')
        .attr('class', 'label')
        .attr('transform', 'rotate(-90)')
        .attr('y', 6)
        .attr('dy', '.71em')
        .style('text-anchor', 'end')
        .text(this.labels.y);

    var that = this;

    this.svg.selectAll('.dot')
        .data(data)
      .enter().append("circle")
	.attr("class", "dot")
	.attr("r", 3.5)
	.attr("cx", this.map.x)
	.attr("cy", this.map.y)
	.style("fill", this.map.z)
	.on("mouseover", function(d) {
	    d3.select(this).transition().attr('r', 10);
	    that.tooltip_container.transition().duration(200).style("opacity", 0.9);
	    that.tooltip_container.html(that.tooltip(d))
		.style("left", (d3.event.pageX+5) + "px")
		.style("top", (d3.event.pageY-30) + "px");
	})
	.on("mouseout", function(d) {
	    d3.select(this).transition().attr('r', 3.5);
	    that.tooltip_container.transition().duration(500).style("opacity", 0);
	})
	.on("click", function(d) {
	    if(typeof(that.prefix) != "undefined") {
		sessionStorage.setItem(that.prefix + "_visited_" + d['user_name'], true);
		d3.select(this).style("fill", "rgba(150, 120, 231, 1)");
	    }
	    window.open("https://en.wikipedia.org/wiki/User:" + d['user_name']);
	});
    $("#result-count").text("Found " + data.length + " editors");

    if(this.highlight_factor != 0) {
	var draw_line = d3.svg.line()
	    .interpolate('basis')
	    .x(function(d) { return d[0]; })
	    .y(function(d) { return d[1]; });
	highlight_data = [];
	for(var ii = Math.floor(this.scales.x.domain()[0]); ii <= this.scales.x.domain()[1]; ii++) {
	    highlight_data.push([this.scales.x(ii), this.scales.y(this.highlight_factor * ii)]);
	}
	var highlight_lines = this.svg.append('g')
	    .attr('class', '.d3_xy_chart_line')
	    .append('path')
	    .attr('class', 'line')
	    .attr('d', function(d) { return draw_line(highlight_data); } );
    }
}

user_graph.Graph.prototype.show = function() {
    this.container.style('display', 'block');
}

user_graph.Graph.prototype.hide = function() {
    this.container.style('display', 'none');
}

user_graph.Graph.prototype.is_shown = function() {
    return this.container.style('display') != 'none';
}

user_graph.Graph.prototype.enable_visited = function(prefix) {
    this.prefix = prefix;
}
