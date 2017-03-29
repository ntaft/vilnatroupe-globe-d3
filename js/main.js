
document.addEventListener('DOMContentLoaded', () => {

// d3 code adapted from http://bl.ocks.org/dwtkns/4973620
  d3.select(window)
    .on('mousemove', mousemove)
    .on('mouseup', mouseup);

  let width = 960;
  let height = 960;

  let proj = d3.geo.orthographic()
    .translate([width / 2, height / 2])
    .clipAngle(90)
    .scale(220 * 2);

  let sky = d3.geo.orthographic()
    .translate([width / 2, height / 2])
    .clipAngle(90)
    .scale(280 * 2);

  let path = d3.geo.path().projection(proj).pointRadius(2);

  let swoosh = d3.svg.line()
    .x(d => d[0])
    .y(d => d[1])
    .interpolate('cardinal')
    .tension(0);

  let links = [],
      arcLines = [];

  let svg = d3.select('body').append('svg')
    .attr('width', width)
    .attr('height', height)
    .on('mousedown', mousedown);

  queue()
    .defer(d3.json, '/map_data')
    .defer(d3.json, '/vt_data')
    .await(ready);

  function ready(error, world, places) {
    color.domain(d3.keys(data[0]).filter(function(key) { // Set the domain of the color ordinal scale to be filtered by troupe; needs work.
      return key;
    }));
    let ocean_fill = svg.append('defs')
      .append('radialGradient')
      .attr('id', 'ocean_fill')
      .attr('cx', '75%')
      .attr('cy', '25%');
    ocean_fill.append('stop')
      .attr('offset', '5%')
      .attr('stop-color', 'rgb(200, 200, 240)');
    ocean_fill.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', 'rgb(150, 150, 170)');

    let globe_highlight = svg.append('defs')
      .append('radialGradient')
      .attr('id', 'globe_highlight')
      .attr('cx', '75%')
      .attr('cy', '25%');
    globe_highlight.append('stop')
      .attr('offset', '5%')
      .attr('stop-color', 'rgb(200, 240, 200)')
      .attr('stop-opacity','0.6');
    globe_highlight.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', 'rgb(100, 120, 100)')
      .attr('stop-opacity','0.2');

    let globe_shading = svg.append('defs')
      .append('radialGradient')
      .attr('id', 'globe_shading')
      .attr('cx', '55%')
      .attr('cy', '45%');
    globe_shading.append('stop')
      .attr('offset','30%')
      .attr('stop-color', '#fff')
      .attr('stop-opacity','0')
    globe_shading.append('stop')
      .attr('offset','100%')
      .attr('stop-color', '#505962')
      .attr('stop-opacity','0.3')

    svg.append('circle')
      .attr('cx', width / 2)
      .attr('cy', height / 2)
      .attr('r', proj.scale())
      .attr('class', 'noclicks')
      .style('fill', 'url(#ocean_fill)');

    svg.append('path')
      .datum(topojson.feature(world, world.objects.land))
      .attr('class', 'land noclicks')
      .attr('d', path);

    svg.append('circle')
      .attr('cx', width / 2).attr('cy', height / 2)
      .attr('r', proj.scale())
      .attr('class','noclicks')
      .style('fill', 'url(#globe_highlight)');

    svg.append('circle')
      .attr('cx', width / 2).attr('cy', height / 2)
      .attr('r', proj.scale())
      .attr('class','noclicks')
      .style('fill', 'url(#globe_shading)');

    svg.append('g').attr('class','points')
      .selectAll('text').data(places.features)
      .enter().append('path')
      .attr('class', 'point')
      .attr('d', path);

    // spawn links between cities as source/target coord pairs
    for (let i = 1; i < places.features.length - 1; i++) {
      if (places.features[i-1].geometry.properties.Troupe === places.features[i].properties.Troupe) {
        links.push({
          source: places.features[i-1].geometry.coordinates,
          target: places.features[i].geometry.coordinates,
          srcProperties: places.features[i].properties,
          trgProperties: places.features[i-1].geometry.properties,
        });
      }
    }

    // build geoJSON features from links array
    links.forEach(function(e,i,a) {
      let feature = {
        'type': 'Feature',
        'geometry': {
          'type': 'LineString',
          'coordinates': [e.source, e.target]
        },
        'properties': {
          'source': e.srcProperties,
          'target': e.trgProperties
        }
      };
      arcLines.push(feature);
    });

    // gets a list of all the troupe data; removes duplicates
    // http://www.jstips.co/en/javascript/deduplicate-an-array/
    let troupeList = Array.from(new Set(places.features.map(feat => feat.properties.Troupe));

    // maps colors to each troupe; ### placeholder colors
    // const colors = ['red', 'blue', 'green', 'yellow', 'brown', 'orange', 'purple', 'cyan'];
    // let count = -1;
    // troupeList = troupeList)).map((troupe) => {
    //   count++;
    //   return [troupe, colors[count]];
    // }

    // via http://bl.ocks.org/DStruths/9c042e3a6b66048b5bd4
    const color = d3.scale.ordinal().range(["#48A36D",  "#56AE7C",  "#64B98C", "#72C39B", "#80CEAA", "#80CCB3", "#7FC9BD", "#7FC7C6", "#7EC4CF", "#7FBBCF", "#7FB1CF", "#80A8CE", "#809ECE", "#8897CE", "#8F90CD", "#9788CD", "#9E81CC", "#AA81C5", "#B681BE", "#C280B7", "#CE80B0", "#D3779F", "#D76D8F", "#DC647E", "#E05A6D", "#E16167", "#E26962", "#E2705C", "#E37756", "#E38457", "#E39158", "#E29D58", "#E2AA59", "#E0B15B", "#DFB95C", "#DDC05E", "#DBC75F", "#E3CF6D", "#EAD67C", "#F2DE8A"]);
    const categories = color.domain().map(function(name) { // Nest the data into an array of objects with new keys
      return {
        name: name, // "name": the csv headers except date
        values: data.map(function(d) { // "values": which has an array of the dates and ratings
          return {
            date: d.date,
            rating: +(d[name]),
            };
        }),
        visible: true // all are visible by default
      };
    });

      svg.selectAll('.flyer')
      .data()
      .filter(':nth-child(even)')
      .style('stroke', 'darkblue');

    svg.append('g').attr('class','arcs')
      .selectAll('path').data(arcLines)
      .enter().append('path')
        .attr('class','arc')
        .attr('d', path);

    svg.append('g').attr('class','flyers')
      .selectAll('path').data(links)
      .enter().append('path')
      .attr('class','flyer')
      .attr("id", d => d.srcProperties.Troupe); // Give each line ID of troupe identifier
      .attr('d', function(d) { return swoosh(flying_arc(d)) });

  issue.append("path")
      .attr("class", "line")
      .style("pointer-events", "none") // Stop line interfering with cursor
      .attr("id", function(d) {
        return "line-" + d.name.replace(" ", "").replace("/", ""); // Give line id of line-(insert issue name, with any spaces replaced with no spaces)
      })
      .attr("d", function(d) {
        return d.visible ? line(d.values) : null; // If array key "visible" = true then draw line, if not then don't
      })
      .attr("clip-path", "url(#clip)")//use clip path to make irrelevant part invisible
      .style("stroke", function(d) { return color(d.name); });

    refresh();
  }

  function flying_arc(pts) {
    let source = pts.source,
        target = pts.target;

  // bends the arc trajectory in relation to the starting point
    let mid = location_along_arc(source, target, 0.7);
    let result = [ proj(source),
                   sky(mid),
                   proj(target) ]
    return result;
  }

  function refresh() {
    svg.selectAll('.land').attr('d', path);
    svg.selectAll('.point').attr('d', path);

    svg.selectAll('.arc').attr('d', path)
      .attr('opacity', function(d) {
        return fade_at_edge(d)
      })

    svg.selectAll('.flyer')
      .attr('d', function(d) { return swoosh(flying_arc(d)) })
      .attr('opacity', function(d) {
        return fade_at_edge(d)
      })

  }

  function fade_at_edge(d) {
    const centerPos = proj.invert([width/2,height/2]);
    const arc = d3.geo.greatArc();
    let start,
        end;
    // function is called on 2 different data structures..
    if (d.source) {
      start = d.source,
      end = d.target;
    }
    else {
      start = d.geometry.coordinates[0];
      end = d.geometry.coordinates[1];
    }

    let start_dist = 1.57 - arc.distance({source: start, target: centerPos});
    let end_dist = 1.57 - arc.distance({source: end, target: centerPos});

    let fade = d3.scale.linear().domain([-.1,0]).range([0,.1])
    let dist = start_dist < end_dist ? start_dist : end_dist;

    return fade(dist)
  }

  function location_along_arc(start, end, loc) {
    let interpolator = d3.geo.interpolate(start,end);
    return interpolator(loc)
  }

  // modified from http://bl.ocks.org/1392560
  let m0, o0;
  function mousedown() {
    m0 = [d3.event.pageX, d3.event.pageY];
    o0 = proj.rotate();
    d3.event.preventDefault();
  }
  function mousemove() {
    if (m0) {
      let m1 = [d3.event.pageX, d3.event.pageY]
        , o1 = [o0[0] + (m1[0] - m0[0]) / 6, o0[1] + (m0[1] - m1[1]) / 6];
      o1[1] = o1[1] > 30  ? 30  :
              o1[1] < -30 ? -30 :
              o1[1];
      proj.rotate(o1);
      sky.rotate(o1);
      refresh();
    }
  }
  function mouseup() {
    if (m0) {
      mousemove();
      m0 = null;
    }
  }
// end of DOM load
});
