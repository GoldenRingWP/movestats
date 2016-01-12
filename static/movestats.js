var union = false;
var graph_margins = { top: 20, right: 100, bottom: 30, left: 60 };

function loadEditsGraph() {
    var accessors = {
	x: function(d) { return d.registered_time; },
	y: function(d) { return d.user_editcount; },
	z: function(d) { return d; }
    };
    var tooltip_text = function(d) {
	return d['user_name'] + ' - ' +
	    d['user_editcount'] + ' edits in ' +
	    Math.floor(d['registered_time']/60) + ':' + Math.floor(d['registered_time'] % 60) +
	    (d['blocked'] == 1 ? "<br/>Blocked" : "");
    };
    var scales = {
	x: d3.scale.sqrt(),
	y: d3.scale.log(),
	z: function(d) {
	    if(d['blocked'] == 1)
		return "rgb(255, 0, 0)";
	    if(sessionStorage.getItem("edits_visited_" + d['user_name'])) {
		return "rgb(150, 120, 231)";
	    }
	    return "rgb(0, 120, 231)";
	}
    };

    var graph = new user_graph.Graph(d3.select(".graph"),
				     graph_margins,
				     accessors,
				     scales,
				     { x: 'Minutes Since Registration', y: 'User Edit Count' },
				     tooltip_text, 0.5,
				     { domain: ["Unvisited", "Visited", "Blocked"], range: ["rgb(0, 120, 231)", "rgb(150, 120, 231)", "rgb(255,0,0)"] });
    graph.hide();

    var click_handler = function() {
	data = {
	    usercount: $("#edit-usercount").val()
	};

	if(data.usercount.length > 0 && !isNaN(data.usercount)) {
	    graph.wait.show();
	    $.ajax( { url: '/movestats/data/edits/',
		      dataType: 'json',
		      data: data,
		      error: function(errr) { console.warn(error); },
		      success: function(result) {
			  graph.wait.hide();
			  graph.draw(result);
		      }
		      });
	}
    };

    d3.select('#edit-refresh').on('click', function() {
	click_handler();
    });

    $("#edit-usercount").val(1000);

    click_handler();

    return graph;
}

function loadMovesGraph() {
    var accessors = {
	x: function(d) { return d.registered_time; },
	y: function(d) { return d.moves; },
	z: function(d) { return d.user_editcount; }
    }
    var tooltip_text = function(d) {
	return d['user_name'] + ' - ' +
	    d['moves'] + ' moves and ' +
	    d['user_editcount'] + ' edits in ' +
	    Math.floor(d['registered_time']) + ' days';
    };
    var scales = {
	x: d3.scale.sqrt(),
	y: d3.scale.log(),
	z: d3.scale.threshold().domain([100, 200, 500, 1000, 2000, 5000])
	    .range(['#ff0000', '#ff5000', '#ffa000', '#ffff00', '#a0ff00', '#50ff00', '#00ff00'])
    };
    var graph = new user_graph.Graph(d3.select(".graph"),
				     graph_margins,
				     accessors,
				     scales,
				     { x: "Days Since Registration", y: "Page Moves", z: "User Edit Count" },
				     tooltip_text);

    var click_handler = function() {
	var namespaces = [];
	$("input.ns:checked").each(function() {
	    namespaces.push($(this).val());
	});
	
	data = {
	    usercount: $("#move-usercount").val(),
	    namespaces: namespaces,
	    multi_ns: $("#multi_ns").prop("checked"),
	    union: union
	};

	if(data.usercount.length > 0 && !isNaN(data.usercount)) {
	    graph.wait.show();
	    $.ajax( { url: '/movestats/data/moves/',
		      dataType: 'json',
		      data: data,
		      error: function(errr) { console.warn(error); },
		      success: function(result) {
			  graph.wait.hide();
			  graph.draw(result);
		      }
		      });
	}
    };

    d3.select('#move-refresh').on('click', function() {
	click_handler();
    });
    d3.select("#ns-all").on("click", function() {
	d3.selectAll(".ns").property("checked", true);
    });
    d3.select("#ns-none").on("click", function() {
	d3.selectAll(".ns").property("checked", false);
    });
    d3.select("#ns-union").on("click", function() {
	if(union) {
	    d3.select("#ns-union").classed("pure-button-active", false).text("Or");
	} else {
	    d3.select("#ns-union").classed("pure-button-active", true).text("And");
	}
    });

    $("#move-usercount").val(500000);

    click_handler();

    return graph;
}

window.onload = function() {
    moves_graph = loadMovesGraph();
    edits_graph = loadEditsGraph();
    edits_graph.enable_visited("edits");
    d3.select('.edits').style('display', 'none');

    d3.select("#tab-moves").on("click", function() {
	if(edits_graph.is_shown()) {
	    edits_graph.hide();
	    d3.select(".edits").style('display', 'none');
	    d3.select('.moves').style('display', 'block');
	    moves_graph.show();
	    d3.select('#tab-moves').classed('pure-button-primary', true);
	    d3.select('#tab-edits').classed('pure-button-primary', false);
	}
    });
    d3.select('#tab-edits').on('click', function() {
	if(moves_graph.is_shown()) {
	    moves_graph.hide();
	    d3.select('.moves').style('display', 'none');
	    d3.select('.edits').style('display', 'block');
	    edits_graph.show();
	    d3.select('#tab-edits').classed('pure-button-primary', true);
	    d3.select('#tab-moves').classed('pure-button-primary', false);
	}
    });
}
