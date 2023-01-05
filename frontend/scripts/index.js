window.addEventListener("load", async () => {
  if ($(".typed").length) {
    var typed_strings = $(".typed").data("typed-items");
    typed_strings = typed_strings.split(",");
    new Typed(".typed", {
      strings: typed_strings,
      loop: true,
      typeSpeed: 50,
      backSpeed: 20,
      backDelay: 2000,
    });
  }

  const newYorkCoordinatesEPSG4326 = [-73.935242, 40.73061]; //[longitude, latitude]
  const newYorkCoordinatesEPSG3857 = [-8230433.49, 4972687.54];

  let markerLayer = null;

  let currentMarkerFeatures = {
    address: "34-41 21ST STREET",
    borough: "QUEENS",
    psa: "POLICE SERVICE AREA #9 SATELLITE",
    zipcode: "11106",
    start_date: "2018-10-01T00:00:00.000Z",
    phase: "15",
    sector: "108B",
    sct_text: "108B",
    sctr_float: "25",
    sq_feet: "15811536.8268",
    pct: "108",
    sq_mile_new: "1.52975223847",
    patrol_bor: "PBQN",
    patrol_boro: "PATROL BORO QUEENS NORTH",
    sq_miles: "0.567163111052",
  };

  //FastAPI URL
  const url = "http://localhost:8000/predict_crime";

  //Form Inputs
  const inputAge = document.getElementById("inputAge");
  const inputSex = document.getElementById("sexSelection");
  const inputRace = document.getElementById("raceSelection");
  const inputDateTime = document.getElementById("inputDateTime");
  const inputLongitude = document.getElementById("inputLongitude");
  const inputLatitude = document.getElementById("inputLatitude");
  const form = document.getElementById("form");

  const predictButton = document.getElementById("predict");
  const currentPositionButton = document.getElementById("current-position");

  form.addEventListener("change", (event) => {
    if (inputAge.value && inputLatitude.value && inputLongitude.value) {
      predictButton.classList.remove("disabled");
    } else {
      predictButton.classList.add("disabled");
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    fetch(
      `${url}?age=${inputAge.value}&sex=${inputSex.value}&race=${
        inputRace.value
      }&datetime=${new Date(inputDateTime.value).getTime() / 1000}&lat=${
        inputLatitude.value
      }&long=${inputLongitude.value}&borough=${
        currentMarkerFeatures.borough
      }&patrol_borough=${currentMarkerFeatures.patrol_boro}&precinct=${
        currentMarkerFeatures.pct
      }`
    )
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        alert(`Crime Prediction: The crime prediction is ${data.prediction}`);
      })
      .catch((err) => {
        console.log(err);
        alert("Error", "An error occurred while predicting the crime");
      });
  });
  //OpenLayers Map
  const point = new ol.style.Circle({
    radius: 5,
    fill: new ol.style.Fill({
      color: "rgba(255, 0, 0, 0.5)",
    }),
    stroke: new ol.style.Stroke({
      color: "red",
      width: 1,
    }),
  });

  const styles = {
    Point: new ol.style.Style({
      image: point,
    }),
    LineString: new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: "green",
        width: 1,
      }),
    }),
    MultiLineString: new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: "green",
        width: 1,
      }),
    }),
    MultiPoint: new ol.style.Style({
      image: point,
    }),
    MultiPolygon: new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: "#00FFFF",
        width: 1,
      }),
      fill: new ol.style.Fill({
        color: "rgba(0, 0, 255, 0.3)",
      }),
    }),
    Polygon: new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: "#00FFFF",
        lineDash: [4],
        width: 3,
      }),
      fill: new ol.style.Fill({
        color: "rgba(0, 0, 255, 0.1)",
      }),
    }),
    GeometryCollection: new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: "magenta",
        width: 2,
      }),
      fill: new ol.style.Fill({
        color: "magenta",
      }),
      image: new ol.style.Circle({
        radius: 10,
        fill: null,
        stroke: new ol.style.Stroke({
          color: "magenta",
        }),
      }),
    }),
    Circle: new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: "red",
        width: 2,
      }),
      fill: new ol.style.Fill({
        color: "rgba(255,0,0,0.2)",
      }),
    }),
  };

  const styleFunction = function (feature) {
    return styles[feature.getGeometry().getType()];
  };

  const NYCHA_PSA_Vector_Source = new ol.source.Vector({
    url: "./assets/NYCHA PSA (Police Service Areas).geojson",
    format: new ol.format.GeoJSON(),
  });
  const NYCHA_PSA_Vector_Layer = new ol.layer.Vector({
    source: NYCHA_PSA_Vector_Source,
    title: "NYCHA PSA",
    visible: true,
    style: styleFunction,
    visible: true,
  });

  const NYPD_Sectors_Vector_Source = new ol.source.Vector({
    url: "./assets/NYPD Sectors.geojson",
    format: new ol.format.GeoJSON(),
  });

  const NYPD_Sectors_Vector_Layer = new ol.layer.Vector({
    source: NYPD_Sectors_Vector_Source,
    title: "NYPD Sectors",
    visible: true,
    style: styleFunction,
    visible: true,
  });

  const map = new ol.Map({
    target: "map",
    layers: [
      new ol.layer.Tile({
        source: new ol.source.OSM(),
        title: "OpenStreetMap",
        visible: true,
        type: "base",
      }),
      NYPD_Sectors_Vector_Layer,
      NYCHA_PSA_Vector_Layer,
    ],
    view: new ol.View({
      center: ol.proj.fromLonLat(newYorkCoordinatesEPSG4326),
      zoom: 10,
    }),
  });

  map.on("pointermove", function (event) {
    var coord3857 = event.coordinate;
    var coord4326 = ol.proj.transform(coord3857, "EPSG:3857", "EPSG:4326");
    $("#mouse4326").text(ol.coordinate.toStringXY(coord4326, 5));
  });

  map.on("singleclick", function (event) {
    var coord3857 = event.coordinate;
    var coord4326 = ol.proj.transform(coord3857, "EPSG:3857", "EPSG:4326");
    inputLatitude.value = coord4326[0];
    inputLongitude.value = coord4326[1];
  });
});
