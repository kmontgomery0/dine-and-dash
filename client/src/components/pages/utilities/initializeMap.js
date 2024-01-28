import mapboxgl from "mapbox-gl";

async function fetchRandomCountry() {
  try {
    // Fetch the list of countries from your backend
    const response = await fetch("/api/countries");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Parse the JSON response
    const countries = await response.json();

    // Select a random country
    const randomIndex = Math.floor(Math.random() * countries.length);
    const randomCountry = countries[randomIndex];

    // Use the random country as needed
    // console.log("Random Country:", randomCountry);
    return randomCountry;
  } catch (error) {
    console.error("Failed to fetch a random country:", error);
  }
}

async function fetchCountryData(countryCode) {
  try {
    // Fetch the list of countries from your backend
    const response = await fetch("/api/countries");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Parse the JSON response
    const countries = await response.json();
    // Find the country by the inputted name
    const countryData = countries.find((country) => country.twoCode === countryCode);
    if (!countryData) {
      throw new Error("Country not found");
    }

    // Use the country data as needed
    // console.log("Input Country:", countryData);
    return countryData;
  } catch (error) {
    console.error("Failed to fetch country data:", error);
  }
}

function parseAdjacentCountries(dataString) {
  // Replace single quotes with double quotes and remove brackets for JSON parsing
  const jsonString = dataString[0].replace(/'/g, '"');
  try {
    const countriesArray = JSON.parse(jsonString);
    return countriesArray;
  } catch (error) {
    console.error("Error parsing adjacent countries data:", error);
    return [];
  }
}
let currentCountry;
const initializeMap = (
  setStartCountry,
  setGoalCountry,
  setCurrentCountry,
  setVisited,
  setcurrentTriviaCountries,
  setOpenTrivia
) => {
  mapboxgl.accessToken =
    "pk.eyJ1Ijoid3V0aG9tYXMiLCJhIjoiY2xyazIxdW5mMDlxZzJpcDdlZWR3Z2QybiJ9.RyFTb-1qZ7D445ptcHwdvQ";
  const map = new mapboxgl.Map({
    container: "map", // container ID
    center: [0, 0], //  .0 position [lng, lat]
    style: "mapbox://styles/wuthomas/clrk24s6p001301pff0hq9wwz",
    zoom: 0, // starting zoom
  });
  map.on("load", async function () {
    map.addSource("country", {
      type: "geojson",
      data: "https://gist.githubusercontent.com/wuthomas-mit/02fb8cd83979415cfd5aed40bc6970ef/raw/25850382799bdd29b32fe48c5336d10ccfa2d1d9/countries.geojson",
      // data: "https://raw.githubusercontent.com/openlayers/ol3/6838fdd4c94fe80f1a3c98ca92f84cf1454e232a/examples/data/geojson/countries.geojson",
    });
    map.addLayer({
      id: "country-fills",
      type: "fill",
      source: "country",
      layout: {},
      paint: {
        "fill-color": "#627BC1",
        "fill-opacity": 0.5,
      },
    });

    map.addLayer({
      id: "country-fills-hover",
      type: "fill",
      source: "country",
      layout: {},
      paint: {
        "fill-color": "#627BC1",
        "fill-opacity": 1,
      },
      filter: ["==", "ISO_A2", ""],
    });
    map.addLayer({
      id: "country-clicked",
      type: "fill",
      source: "country",
      layout: {},
      paint: {
        "fill-color": "#FF0000",
        "fill-opacity": 1,
      },
      filter: ["==", "ISO_A2", ""],
    });

    // defines Start and Goal countries that stay unchanged through the game
    const startCountryData = await fetchRandomCountry();
    currentCountry = startCountryData;
    setStartCountry(startCountryData.Country);
    setCurrentCountry(startCountryData);

    const goalCountryData = await fetchRandomCountry();
    setGoalCountry(goalCountryData.Country);

    // start a set of the new countries user has visited
    let visited = new Set();
    visited.add(startCountryData.twoCode);

    const lat = Number(currentCountry.Lat.replace(/"/g, ""));
    const long = Number(currentCountry.Long.replace(/"/g, ""));

    const goalLong = Number(goalCountryData.Long.replace(/"/g, ""));
    const goalLat = Number(goalCountryData.Lat.replace(/"/g, ""));

    map.flyTo({ center: [long, lat], zoom: 4 });
    map.setFilter("country-clicked", ["==", "ISO_A2", currentCountry.twoCode]);

    // Adds a red pin to denote the goal country
    // Load an image from an external URL.
    // map.loadImage("https://docs.mapbox.com/mapbox-gl-js/assets/cat.png", (error, image) => {
    map.loadImage(
      "https://cors-anywhere.herokuapp.com/https://gist.github.com/assets/92048050/835fdc0a-eccf-4ece-b383-931d8c11673e",
      (error, image) => {
        if (error) throw error;
        // Add the image to the map style.
        map.addImage("pin", image);
        // Add a data source containing one point feature.
        map.addSource("point", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: [goalLong, goalLat],
                },
              },
            ],
          },
        });
        // Add a layer to use the image to represent the data.
        map.addLayer({
          id: "points",
          type: "symbol",
          source: "point", // reference the data source
          layout: {
            "icon-image": "pin", // reference the image
            "icon-size": 0.15,
          },
        });
      }
    );

    // When the user moves their mouse over the page, we look for features
    // at the mouse position (e.point) and within the states layer (states-fill).
    // If a feature is found, then we'll update the filter in the state-fills-hover
    // layer to only show that state, thus making a hover effect.
    let lastHoveredCountry = null;
    let lastHoveredData = null;
    map.on("mousemove", async function (e) {
      var features = map.queryRenderedFeatures(e.point, {
        layers: ["country-fills"],
      });
      if (features.length) {
        var hoveredCountry = features[0].properties.ISO_A2;
        if (hoveredCountry !== lastHoveredCountry && hoveredCountry !== currentCountry.twoCode) {
          lastHoveredCountry = hoveredCountry;
          lastHoveredData = await fetchCountryData(hoveredCountry);
        }
        if (
          lastHoveredData !== null &&
          lastHoveredData !== undefined &&
          parseAdjacentCountries(currentCountry.Adjacent).includes(lastHoveredData.Country)
        ) {
          // console.log("success", lastHoveredData.Country);
          map.setFilter("country-fills-hover", ["==", "ISO_A2", hoveredCountry]);
          map.getCanvas().style.cursor = "pointer";
        } else {
          map.setFilter("country-fills-hover", ["==", "ISO_A2", ""]);
          map.getCanvas().style.cursor = "";
        }
      } else {
        map.setFilter("country-fills-hover", ["==", "ISO_A2", ""]);
        map.getCanvas().style.cursor = "";
      }
    });

    // Reset the state-fills-hover layer's filter when the mouse leaves the map
    map.on("mouseout", function () {
      map.getCanvas().style.cursor = "auto";
      map.setFilter("country-fills-hover", ["==", "ISO_A2", ""]);
    });

    // let lastClickedCountry = null;
    map.on("click", async function (e) {
      var features = map.queryRenderedFeatures(e.point, {
        layers: ["country-fills"],
      });
      if (features.length) {
        var clickedCountry = features[0].properties.ISO_A2;

        const clicked_data = await fetchCountryData(clickedCountry);
        if (
          clicked_data !== undefined &&
          parseAdjacentCountries(currentCountry.Adjacent).includes(clicked_data.Country)
        ) {
          const triviaCountry = await fetchCountryData(features[0].properties.ISO_A2);
          const random_1 = await fetchRandomCountry();
          const random_2 = await fetchRandomCountry();
          const random_3 = await fetchRandomCountry();

          const tCountries = [triviaCountry, random_1, random_2, random_3];
          setcurrentTriviaCountries(tCountries);

          // add current country to set of visited countries
          // NEED TO ADD LATER to user's profile of total visited
          visited.add(clickedCountry);
          setVisited(visited);
          const latitude = Number(clicked_data.Lat.replace(/"/g, ""));
          const longitude = Number(clicked_data.Long.replace(/"/g, ""));
          map.flyTo({ center: [longitude, latitude], zoom: 4, speed: 0.4 });
          map.setFilter("country-clicked", ["==", "ISO_A2", ""]);
          map.setFilter("country-clicked", ["==", "ISO_A2", clickedCountry]);
          currentCountry = clicked_data;
          setCurrentCountry(clicked_data);
          setTimeout(() => {
            setOpenTrivia(true); // Open the trivia modal after a delay
          }, 1000); // Delay in milliseconds, e.g., 3000ms = 3 seconds
        }
      }
    });
  });
};

export default initializeMap;
