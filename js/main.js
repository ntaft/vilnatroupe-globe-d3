
document.addEventListener('DOMContentLoaded', () => {

// adapted from http://bl.ocks.org/dwtkns/4973620
  d3.select(window)
    .on('mousemove', mousemove)
    .on('mouseup', mouseup);

  const width = 960;
  const height = 960;

  // projection of map
  const proj = d3.geoOrthographic()
    .translate([width / 2, height / 2])
    .clipAngle(90)
    .scale(220 * 2);

  // outer bounds of sky
  const sky = d3.geoOrthographic()
    .translate([width / 2, height / 2])
    .clipAngle(90)
    .scale(225 * 2);

  const path = d3.geoPath().projection(proj).pointRadius(2);



  let links = [];
  let arcLines = [];

  const svg = d3.select('body').append('svg')
    .attr('width', width)
    .attr('height', height)
    .on('mousedown', mousedown);

  const swoosh = d3.line()
    .x(d => d[0])
    .y(d => d[1])
    .curve(d3.curveCardinal);

  // defers data until dom load
  d3.queue()
    .defer(d3.json, '/map_data')
    .defer(d3.json, '/vt_data')
    .await(ready);

  function ready(error, world, places) {
    const color = d3.scaleOrdinal().range(['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', '#a65628', '#f781bf']);
    // creates list of all the Vilna Troupes
    const troupeList = Array.from(new Set(places.features.map(feat => feat.properties.troupe)));
    // Set the domain of the color ordinal scale, filtered by troupe.
    color.domain(troupeList.map(key => key));

    // defines all globe fill and highlight gradient parameters
    const ocean_fill = svg.append('defs')
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

    const globe_highlight = svg.append('defs')
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

    const globe_shading = svg.append('defs')
      .append('radialGradient')
      .attr('id', 'globe_shading')
      .attr('cx', '55%')
      .attr('cy', '45%');
    globe_shading.append('stop')
      .attr('offset','30%')
      .attr('stop-color', '#fff')
      .attr('stop-opacity','0');
    globe_shading.append('stop')
      .attr('offset','100%')
      .attr('stop-color', '#505962')
      .attr('stop-opacity', '0.3');

    // creates a blue circle with gradient
    svg.append('circle')
      .attr('cx', width / 2)
      .attr('cy', height / 2)
      .attr('r', proj.scale())
      .attr('class', 'noclicks')
      .style('fill', 'url(#ocean_fill)');

    // draws all landmasses on globe surface
    svg.append('path')
      .datum(topojson.feature(world, world.objects.land))
      .attr('class', 'land noclicks')
      .attr('d', path);

    // radial highlights on globe surface for 3d effect
    svg.append('circle')
      .attr('cx', width / 2).attr('cy', height / 2)
      .attr('r', proj.scale())
      .attr('class', 'noclicks')
      .style('fill', 'url(#globe_highlight)');

    // radial shading on globe surface for 3d effect
    svg.append('circle')
      .attr('cx', width / 2).attr('cy', height / 2)
      .attr('r', proj.scale())
      .attr('class', 'noclicks')
      .style('fill', 'url(#globe_shading)');

    // attaches city points on globe surface
    svg.append('g').attr('class', 'points')
      .selectAll('text')
      .data(places.features)
      .enter()
        .append('path')
        .attr('class', 'point')
        .attr('d', path);

    // spawn links between cities as source/target coord pairs
    for (let i = 1; i < places.features.length - 1; i++) {
      if (places.features[i-1].properties.troupe === places.features[i].properties.troupe) {
        links.push({
          source: places.features[i-1].geometry.coordinates,
          target: places.features[i].geometry.coordinates,
          srcProperties: places.features[i].properties,
          trgProperties: places.features[i-1].geometry.properties,
        });
      }
    }

    // build geoJSON features from links array
    links.forEach((e, i, a) => {
      const feature = {
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

    // appends arc flyer "shadows" that cast on the globe surface.
    svg.append('g').attr('class', 'arcs')
      .selectAll('path').data(arcLines)
      .enter()
        .append('path')
        .attr('class', 'arc')
        .attr('d', path);

    // appends flyer arcs that connect all cities in the travel path
    svg.append('g').attr('class', 'flyers')
      .selectAll('path').data(links)
      .enter()
        .append('path')
        .attr('class', 'flyer')
        // Give each line unique ID tied to troupe & coords
        .attr("id", d => `${d.srcProperties.date}-${d.source}-${d.target}`)
        // .attr("class", d => `${d.srcProperties.troupe}`)
        .attr('d', d => swoosh(flyingArc(d)))
        // colors each flyer according to troupe legend colors
        .style('stroke', (d) => {
          return color(troupeList.filter(t => d.srcProperties.troupe === t));
        });

    // appends legends for each troupe
    svg.append('g')
      .attr('class', 'legend')
      .selectAll('text')
      .data(troupeList)
      .enter()
        .append('text')
        .text( d => `• ${d}`)
        .attr('fill', d => color(d))
        .attr('y', (d, i) => 20 * (i + 1));

      /*
      // example for visibility filter for arc lines, need to build this one out...
      .attr("d", function(d) {
        // If array key "visible" = true then draw line, if not then don't
        return d.visible ? line(d) : null;
      })
      //use clip path attribute to make irrelevant part invisible
      .attr("clip-path", "url(#clip)")
      */

    refresh();
  }

  function flyingArc(pts) {
    const source = pts.source;
    const target = pts.target;
  // bends the arc trajectory in relation to the starting point and distance
    const mid = locAlongArcs(source, target, 0.7);
    const result = [
      proj(source),
      [sky(mid)[0], sky(mid)[1] - (d3.geoDistance(source, target) * 10)],
      proj(target)
    ];
    return result;
  }
  // calculates the distance between coordinates using the haversine formula
  // adapted from https://rosettacode.org/wiki/Haversine_formula#ES5
  function haversine(coord1, coord2) {
    // converts into radians
    const [lat1, lon1, lat2, lon2] = [...coord1, ...coord2].map(deg => (deg / 180.0) * Math.PI);
    const R = 6372.8; // r of earth, km
    const [dLat, dLon] = [lat2 - lat1, lon2 - lon1];
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    return R * 2 * Math.asin(Math.sqrt(a));
  }

  // redraws svg on rotation
  function refresh() {
    svg.selectAll('.land').attr('d', path);
    svg.selectAll('.point').attr('d', path);

    svg.selectAll('.arc').attr('d', path)
      .attr('opacity', d => fadeAtEdge(d));

    svg.selectAll('.flyer')
      .attr('d', d => swoosh(flyingArc(d)))
      .attr('opacity', d => fadeAtEdge(d));
  }

  // fades arc flyers as they approach horizon
  function fadeAtEdge(d) {
    const centerPos = proj.invert([width/2,height/2]);
    const arc = d3.geoPath();
    let start,
        end;
    // function is called on 2 different data structures..
    if (d.source) {
      start = d.source;
      end = d.target;
    } else {
      start = d.geometry.coordinates[0];
      end = d.geometry.coordinates[1];
    }

    const startDist = 1.57 - d3.geoDistance(start, centerPos);
    const endDist = 1.57 - d3.geoDistance(end, centerPos);

    const fade = d3.scaleLinear().domain([-.1, 0]).range([0, .1]);
    const dist = startDist < endDist ? startDist : endDist;

    return fade(dist);
  }

  function locAlongArcs(start, end, loc) {
    const interpolator = d3.geoInterpolate(start, end);
    return interpolator(loc);
  }

  // modified from http://bl.ocks.org/1392560
  let m0,
      o0;
  function mousedown() {
    m0 = [d3.event.pageX, d3.event.pageY];
    o0 = proj.rotate();
    d3.event.preventDefault();
  }

  function mousemove() {
    if (m0) {
      const m1 = [d3.event.pageX, d3.event.pageY];
      const o1 = [o0[0] + (m1[0] - m0[0]) / 6, o0[1] + (m0[1] - m1[1]) / 6];
      o1[1] = o1[1] > 30 ? 30 :
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
