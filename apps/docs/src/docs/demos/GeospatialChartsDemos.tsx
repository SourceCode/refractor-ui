import {
  ChoroplethMap,
  GeoFlowArcMap,
  PointClusterMap,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface GeospatialChartsDemosProps {
  componentId: string;
}

export function GeospatialChartsDemos({ componentId }: GeospatialChartsDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'choropleth-map':
      return (
        <div className="w-full max-w-2xl">
          <ChoroplethMap
            title="Global Edge Traffic Share by Region"
            tone="primary"
            valueUnit="M"
            regions={[
              { id: 'na', name: 'North America', value: 142, detail: '44 PoPs · 14ms median' },
              { id: 'eu', name: 'Europe', value: 118, detail: '38 PoPs · 18ms median' },
              { id: 'as', name: 'Asia-Pacific', value: 164, detail: '52 PoPs · 21ms median' },
              { id: 'sa', name: 'South America', value: 46, detail: '12 PoPs · 29ms median' },
              { id: 'af', name: 'Africa', value: 28, detail: '9 PoPs · 34ms median' },
              { id: 'me', name: 'Middle East', value: 54, detail: '11 PoPs · 24ms median' },
              { id: 'oc', name: 'Oceania', value: 39, detail: '8 PoPs · 19ms median' },
            ]}
            onSelectRegion={(region, sharePct) =>
              dispatch(
                pushToast({
                  title: region.name,
                  description: `${region.value}M requests (${sharePct}% share)`,
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'point-cluster-map':
      return (
        <div className="w-full max-w-2xl">
          <PointClusterMap
            title="Active Compute Clusters & Edge Nodes"
            defaultZoom={1}
            clusterRadius={52}
            points={[
              { id: 'sfo', label: 'San Francisco', lat: 37.77, lng: -122.42, category: 'Primary', value: 98, tone: 'primary' },
              { id: 'sjc', label: 'San Jose', lat: 37.34, lng: -121.89, category: 'Primary', value: 94, tone: 'primary' },
              { id: 'lax', label: 'Los Angeles', lat: 34.05, lng: -118.24, category: 'Edge', value: 86, tone: 'secondary' },
              { id: 'nyc', label: 'New York', lat: 40.71, lng: -74.01, category: 'Primary', value: 99, tone: 'primary' },
              { id: 'bos', label: 'Boston', lat: 42.36, lng: -71.06, category: 'Edge', value: 84, tone: 'secondary' },
              { id: 'lon', label: 'London', lat: 51.51, lng: -0.13, category: 'Primary', value: 96, tone: 'emerald' },
              { id: 'fra', label: 'Frankfurt', lat: 50.11, lng: 8.68, category: 'Primary', value: 95, tone: 'emerald' },
              { id: 'ams', label: 'Amsterdam', lat: 52.37, lng: 4.9, category: 'Edge', value: 91, tone: 'emerald' },
              { id: 'tok', label: 'Tokyo', lat: 35.68, lng: 139.65, category: 'Primary', value: 97, tone: 'amber' },
              { id: 'syd', label: 'Sydney', lat: -33.87, lng: 151.21, category: 'Edge', value: 88, tone: 'rose' },
            ]}
            onSelectPoint={(pt) =>
              dispatch(
                pushToast({
                  title: pt.label,
                  description: `${pt.category ?? 'Node'} · ${pt.lat.toFixed(1)}°, ${pt.lng.toFixed(1)}°`,
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'geo-flow-arc-map':
      return (
        <div className="w-full max-w-2xl">
          <GeoFlowArcMap
            title="Intercontinental Backbone Flow Arcs"
            valueUnit=" Gbps"
            hubs={[
              { id: 'sfo', label: 'San Francisco', lat: 37.77, lng: -122.42, tone: 'primary' },
              { id: 'nyc', label: 'New York', lat: 40.71, lng: -74.01, tone: 'primary' },
              { id: 'lon', label: 'London', lat: 51.51, lng: -0.13, tone: 'secondary' },
              { id: 'sin', label: 'Singapore', lat: 1.35, lng: 103.82, tone: 'emerald' },
              { id: 'tok', label: 'Tokyo', lat: 35.68, lng: 139.65, tone: 'amber' },
              { id: 'syd', label: 'Sydney', lat: -33.87, lng: 151.21, tone: 'rose' },
            ]}
            flows={[
              { id: 'f1', origin: 'sfo', destination: 'tok', volume: 420, label: 'Trans-Pacific Fiber', tone: 'primary' },
              { id: 'f2', origin: 'nyc', destination: 'lon', volume: 580, label: 'Trans-Atlantic Core', tone: 'secondary' },
              { id: 'f3', origin: 'lon', destination: 'sin', volume: 310, label: 'EMEA → APAC Trunk', tone: 'emerald' },
              { id: 'f4', origin: 'sin', destination: 'syd', volume: 215, label: 'Oceania Relay', tone: 'rose' },
              { id: 'f5', origin: 'tok', destination: 'sin', volume: 290, label: 'East Asia Mesh', tone: 'amber' },
            ]}
            onSelectFlow={(flow, origin, dest) =>
              dispatch(
                pushToast({
                  title: `${origin.label} → ${dest.label}`,
                  description: `${flow.volume} Gbps${flow.label ? ` · ${flow.label}` : ''}`,
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    default:
      return null;
  }
}
