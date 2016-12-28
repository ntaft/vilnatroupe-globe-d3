    var context = d3.select("canvas").node().getContext("2d"),
        path = d3.geoPath(d3.geoOrthographic(), context);

    d3.json("https://d3js.org/world-110m.v1.json", function(error, world) {
      if (error) throw error;

      context.beginPath();
      path(topojson.mesh(world));
      context.stroke();
    });
