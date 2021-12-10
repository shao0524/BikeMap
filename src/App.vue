<template>
  <div class="App">
    <Loading v-model:active="isLoading" :is-full-page="fullPage" />
    <div class="sidebar" :class="{ active: station_isOpen }">
      <div class="sidebar-header">
        <div class="container position-relative">
          <button
            type="button"
            class="closeBtn"
            @click="station_isOpen = false"
          >
            <i class="fas fa-times"></i>
          </button>
          <h3 class="h3 text-center py-4 mb-0">附近租借站</h3>
        </div>
      </div>
      <div class="sidebar-content">
        <h3 class="h3 text-center mt-3" v-if="!(data.filterData.length > 0)">
          附近沒有自行車租借站
        </h3>
        <button
          type="button"
          class="sidebar-item"
          v-for="station in data.filterData"
          :key="station.StationUID"
          @click="panTo(station)"
        >
          <div
            class="container d-flex justify-content-between align-items-center"
          >
            <img
              src="~image/bike.svg"
              class="sidebar-item-icon"
              :alt="station.StationName.Zh_tw"
            />
            <h6 class="sidebar-item-title h6">
              {{ station.StationName.Zh_tw }}
            </h6>
            <div class="sidebar-item-info">
              <h6 class="h6 text-left">
                <i class="fas fa-biking bikeIcon mr-3"></i>可借：{{
                  station.AvailableRentBikes
                }}
              </h6>
              <h6 class="h6 text-left">
                <i class="fas fa-parking parkIcon mr-3"></i>可停：{{
                  station.AvailableReturnBikes
                }}
              </h6>
            </div>
          </div>
        </button>
      </div>
      <div class="sidebar-footer">
        <h5 class="h5 py-3 mb-0 text-center">下次更新時間：{{ formatTime }}</h5>
      </div>
    </div>
    <!-- 自行車車道 -->
    <div class="sidebar" :class="{ active: search_isOpen }">
      <div class="sidebar-header">
        <div class="container position-relative">
          <h3 class="h3 text-center py-4 mb-0">自行車車道</h3>
          <button type="button" class="closeBtn" @click="search_isOpen = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      <div class="sidebar-content">
        <h3 class="h3 text-center mt-3" v-if="data.laneData < 0">
          找不到相關的自行車車道
        </h3>
        <template
          v-for="(lane, index) in data.laneData"
          :key="`${lane.RouteName}${index}`"
        >
          <button type="button" class="search-item" @click="drawLane(lane)">
            <div class="container">
              <h5 class="h5 font-weight-bolder mt-3">{{ lane.RouteName }}</h5>
              <h6 class="h6">地點：{{ lane.City }}{{ lane.Town }}</h6>
              <h6 class="h6">起點：{{ lane.RoadSectionStart || "未知" }}</h6>
              <h6 class="h6">終點：{{ lane.RoadSectionEnd || "未知" }}</h6>
              <h6 class="h6">車道長度：{{ lane.CyclingLength || "未知" }} m</h6>
              <h6 class="h6">行車方向：{{ lane.Direction || "未知" }}</h6>
            </div>
          </button>
        </template>
      </div>

      <div class="search-itemGroup"></div>
    </div>

    <!-- map -->
    <select
      name="city"
      class="search-select mb-3"
      v-model="data.selected.city"
      @change="searchLane"
    >
      <option value="" selected disabled>請選擇自行車道地點</option>
      <template v-for="city in data.cities" :key="city.EngName">
        <option
          :value="city.EngName"
          v-if="
            city.EngName !== 'KinmenCounty' &&
            city.EngName !== 'LienchiangCounty' &&
            city.EngName !== 'Hsinchu'
          "
        >
          {{ city.name }}
        </option>
      </template>
    </select>
    <div id="map">
      <div class="btnGroup">
        <div class="btnGroup-item">
          <button
            type="button"
            class="bikeStationBtn"
            title="自行車租借站"
            @click="station_isOpen = !station_isOpen"
          >
            <i class="fas fa-bicycle"></i>
          </button>
        </div>

        <div class="btnGroup-item">
          <button
            type="button"
            class="laneBtn"
            title="自行車車道"
            @click="search_isOpen = !search_isOpen"
            :disabled="!data.selected.city"
          >
            <i class="fas fa-draw-polygon"></i>
          </button>
        </div>
        <div class="btnGroup-item">
          <button
            type="button"
            class="localBtn"
            @click="getCurrentLocation"
            title="目前位置"
          >
            <i class="fas fa-street-view"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Loading from "vue-loading-overlay";
import "vue-loading-overlay/dist/vue-loading.css";
import axios from "axios";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-iconmaterial";
import "leaflet-iconmaterial/dist/leaflet.icon-material.css";
import cities from "@/assets/taiwan_districts.json";
import headers from "helper/header.js";
import Wkt from "wicket";
import { onMounted, reactive, ref, computed } from "vue";
let osmMap = {};
// icon
const localIcon = L.IconMaterial.icon({
  icon: "directions_run",
  iconColor: "yellow",
  markerColor: "black",
  outlineColor: "white",
  outlineWidth: 1,
  iconSize: [31, 42],
});
const bikeStationIcon_G = L.IconMaterial.icon({
  icon: "pedal_bike",
  iconColor: "white",
  markerColor: "green",
  outlineColor: "white",
  outlineWidth: 1,
  iconSize: [31, 42],
  popupAnchor: [0, -40],
});
const bikeStationIcon_Y = L.IconMaterial.icon({
  icon: "pedal_bike",
  iconColor: "white",
  markerColor: "green",
  outlineColor: "white",
  outlineWidth: 1,
  iconSize: [31, 42],
  popupAnchor: [0, -40],
});
const bikeStationIcon_R = L.IconMaterial.icon({
  icon: "pedal_bike",
  iconColor: "white",
  markerColor: "green",
  outlineColor: "white",
  outlineWidth: 1,
  iconSize: [31, 42],
  popupAnchor: [0, -40],
});
let center = {};
export default {
  name: "App",
  components: {
    Loading,
  },
  setup() {
    const data = reactive({
      filterData: [],
      cities,
      selected: {
        city: "",
      },
      laneData: [],
    });
    const station_isOpen = ref(true);
    const search_isOpen = ref(false);
    const isLoading = ref(false);
    const fullPage = ref(true);
    let time = ref(0);
    //取得租借站資料
    const getStations = (lat, lng, m = 1000) => {
      const api = `${process.env.VUE_APP_TDXAPI}/Bike/Station/NearBy`;
      return axios
        .get(api, {
          headers,
          params: {
            $spatialFilter: `nearby(${lat},${lng},${m})`,
            $format: "JSON",
          },
        })
        .then((res) => {
          return res.data;
        })
        .catch((err) => {
          console.error(err);
        });
    };
    const getAvailability = (lat, lng, m = 1000) => {
      const api = `${process.env.VUE_APP_TDXAPI}/Bike/Availability/NearBy`;
      return axios
        .get(api, {
          headers,
          params: {
            $spatialFilter: `nearby(${lat},${lng},${m})`,
            $format: "JSON",
          },
        })
        .then((res) => {
          return res.data;
        })
        .catch((err) => {
          console.error(err);
        });
    };
    const addStationMarker = async (lat, lng) => {
      let filterData = [];
      isLoading.value = true;
      const stationsData = await getStations(lat, lng);
      const availabilityData = await getAvailability(lat, lng);
      stationsData.forEach((station) => {
        availabilityData.forEach((item) => {
          if (station.StationUID === item.StationUID) {
            station.AvailableRentBikes = item.AvailableRentBikes;
            station.AvailableReturnBikes = item.AvailableReturnBikes;
            station.ServiceStatus = item.ServiceStatus;
            filterData.push(station);
          }
        });
      });
      data.filterData = filterData;
      // 建立marker;
      let markers = [];
      await filterData.forEach((e) => {
        const { ServiceStatus, StationUID } = e;
        const { PositionLat, PositionLon } = e.StationPosition;
        let marker = {};
        let stationState = "";
        //判斷狀態
        switch (ServiceStatus) {
          case 0:
            stationState = "停止服務";
            marker = setMarker(
              PositionLat,
              PositionLon,
              StationUID,
              bikeStationIcon_R
            );
            break;
          case 1:
            stationState = "正常服務";
            marker = setMarker(
              PositionLat,
              PositionLon,
              StationUID,
              bikeStationIcon_G
            );
            break;
          case 2:
            stationState = "暫停服務";
            marker = setMarker(
              PositionLat,
              PositionLon,
              StationUID,
              bikeStationIcon_Y
            );
            break;
        }

        const layer = marker.bindPopup(
          `<h5 class="h5 font-weight-bolder">${e.StationName.Zh_tw}</h5>
               <h6 class="h6">地點：${e.StationAddress.Zh_tw}</h6>
               <h6 class="h6">服務類型：YouBike${e.ServiceType}.0</h6>
               <h6 class="h6">服務狀態：${stationState}</h6>
               <h6 class="h6">可容納車輛：${e.BikesCapacity}</h6>
               <h6 class="h6">可租借車輛：${e.AvailableRentBikes}</h6>
               <h6 class="h6">可歸還車輛：${e.AvailableReturnBikes}</h6>`
        );
        markers.push(layer);
      });
      L.layerGroup(markers, { id: "bikeStation" }).addTo(osmMap);
      time.value = 300;
      isLoading.value = false;
    };
    //設定marker
    const setMarker = (lat, lng, id, icon) => {
      return L.marker([lat, lng], { icon, id });
    };
    //定位
    const getCurrentLocation = function () {
      //清除圖層
      osmMap.eachLayer((e) => {
        if (e.options.id !== "baseLayer") {
          e.remove();
        }
      });
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { longitude, latitude } = position.coords;
            setMarker(latitude, longitude, "local", localIcon).addTo(osmMap);
            osmMap.setView([latitude, longitude], 18);
            // 建立自行車站資料
            center.lat = latitude;
            center.lng = longitude;
            addStationMarker(latitude, longitude);
          },
          (e) => {
            const { code, message } = e;
            console.error(code);
            console.error(message);
          }
        );
      }
    };

    const panTo = (item) => {
      const { StationUID } = item;
      osmMap.eachLayer((layer) => {
        if (layer.options.id === StationUID) {
          osmMap.panTo(layer._latlng);
          layer.openPopup();
        }
      });
      station_isOpen.value = false;
    };
    const searchLane = () => {
      const api = `${process.env.VUE_APP_TDXAPI}/Cycling/Shape/${data.selected.city}`;
      axios
        .get(api, {
          headers,
          params: {
            $format: "JSON",
          },
        })
        .then((res) => {
          data.laneData = res.data;
          search_isOpen.value = true;
        })
        .catch((err) => {
          console.error(err);
        });
    };
    const drawLane = (item) => {
      //清除圖層
      osmMap.eachLayer((layer) => {
        if (layer.options.id !== "baseLayer") {
          layer.remove();
        }
      });
      const { Geometry } = item;
      const wkt = new Wkt.Wkt();
      wkt.read(Geometry);
      const geojsonFeature = wkt.toJson();
      const myStyle = {
        color: "orange",
        weight: 5,
        opacity: 0.65,
      };
      const laneLayer = L.geoJSON(geojsonFeature, {
        id: "laneLayer",
        style: myStyle,
      }).addTo(osmMap);

      laneLayer.addData(geojsonFeature);
      osmMap.fitBounds(laneLayer.getBounds());
      //中心位置
      const { lat, lng } = laneLayer.getBounds().getCenter();
      [center["lat"], center["lng"]] = [lat, lng];

      addStationMarker(lat, lng);
      //顯示自行車資料
      search_isOpen.value = false;
      station_isOpen.value = true;
    };

    const formatTime = computed(() => {
      let minutes = Math.floor(time.value / 60);
      let seconds = time.value % 60;
      if (minutes < 10) {
        minutes = `0${minutes}`;
      }
      if (seconds < 10) {
        seconds = `0${seconds}`;
      }

      return `${minutes} ：${seconds}`;
    });

    onMounted(() => {
      isLoading.value = true;
      osmMap = L.map("map", { zoomControl: false });
      L.control.zoom({ position: "topright" }).addTo(osmMap);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        id: "baseLayer",
      }).addTo(osmMap);
      //取得目前所在位置
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { longitude, latitude } = position.coords;
            setMarker(latitude, longitude, "local", localIcon).addTo(osmMap);
            osmMap.setView([latitude, longitude], 18);
            // 建立自行車站資料
            center.lat = latitude;
            center.lng = longitude;
            addStationMarker(latitude, longitude);
            //倒數更新時間
            setInterval(() => {
              const { lat, lng } = center;
              if (time.value <= 0) {
                addStationMarker(lat, lng);
              } else {
                time.value -= 1;
              }
            }, 1000);
          },
          (e) => {
            const { code, message } = e;
            console.error(code);
            console.error(message);
          }
        );
      }
    });
    return {
      osmMap,
      getCurrentLocation,
      data,
      station_isOpen,
      search_isOpen,
      panTo,
      searchLane,
      drawLane,
      isLoading,
      fullPage,
      formatTime,
    };
  },
};
</script>

<style lang="scss">
@import "scss/all.scss";
</style>
