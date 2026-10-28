/**
 * Known bike-share operators (from the web app's partner presets, 28 Oct 2026). Used to recognise
 * a partner bike's QR code even before its operator is registered on-chain; only registered
 * operators get a credited ride.
 */
import type { QrOperator } from './bikeQr';

export const OPERATOR_PRESETS: QrOperator[] = [
  {
    id: 'donkey_republic',
    name: 'Donkey Republic',
    website: 'https://www.donkey.bike',
    systems: [
      { systemId: 'donkey_antwerp', city: 'Antwerp', countryCode: 'BE' },
      { systemId: 'donkey_gh', city: 'Ghent', countryCode: 'BE' },
      { systemId: 'donkey_westhoek', city: 'Westhoek', countryCode: 'BE' },
      { systemId: 'donkey_am', city: 'Amsterdam', countryCode: 'NL' },
      { systemId: 'donkey_den_haag', city: 'Den Haag', countryCode: 'NL' },
      { systemId: 'donkey_dordrecht', city: 'Dordrecht', countryCode: 'NL' },
      { systemId: 'donkey_katwijk', city: 'Katwijk', countryCode: 'NL' },
      { systemId: 'donkey_rivierenland', city: 'Rivierenland', countryCode: 'NL' },
      { systemId: 'donkey_copenhagen', city: 'Copenhagen', countryCode: 'DK' },
      { systemId: 'donkey_barcelona', city: 'Barcelona', countryCode: 'ES' },
      { systemId: 'donkey_helsinki', city: 'Helsinki', countryCode: 'FI' },
      { systemId: 'donkey_ge', city: 'Geneva', countryCode: 'CH' },
    ],
  },
  {
    id: 'dott',
    name: 'Dott',
    website: 'https://ridedott.com',
    systems: [
      { systemId: 'dott_brussels', city: 'Brussels', countryCode: 'BE' },
      { systemId: 'dott_ghent', city: 'Ghent', countryCode: 'BE' },
      { systemId: 'dott_liege', city: 'Liège', countryCode: 'BE' },
      { systemId: 'dott_charleroi', city: 'Charleroi', countryCode: 'BE' },
      { systemId: 'dott_mons', city: 'Mons', countryCode: 'BE' },
      { systemId: 'dott_dubai', city: 'Dubai', countryCode: 'AE' },
    ],
  },
  {
    id: 'lime',
    name: 'Lime',
    website: 'https://www.li.me',
    systems: [
      { systemId: 'lime_kortrijk', city: 'Kortrijk', countryCode: 'BE' },
      { systemId: 'lime_tel_aviv', city: 'Tel Aviv', countryCode: 'IL' },
      { systemId: 'lime_chicago', city: 'Chicago', countryCode: 'US' },
    ],
  },
  {
    id: 'citi_bike',
    name: 'Citi Bike',
    website: 'https://citibikenyc.com',
    systems: [
      { systemId: 'citi_nyc', city: 'New York', countryCode: 'US' },
    ],
  },
  {
    id: 'velib_metropole',
    name: 'V\u00e9lib\u2019 M\u00e9tropole',
    website: 'https://www.velib-metropole.fr',
    systems: [
      { systemId: 'velib_paris', city: 'Paris', countryCode: 'FR' },
    ],
  },
  {
    id: 'nextbike',
    name: 'nextbike',
    website: 'https://www.nextbike.net',
    systems: [
      { systemId: 'nextbike_bn', city: 'Berlin', countryCode: 'DE' },
      { systemId: 'nextbike_wr', city: 'Vienna', countryCode: 'AT' },
      { systemId: 'nextbike_hd', city: 'Zagreb', countryCode: 'HR' },
      { systemId: 'nextbike_bi', city: 'Bratislava', countryCode: 'SK' },
      { systemId: 'nextbike_zg', city: 'Gothenburg', countryCode: 'SE' },
    ],
  },
  {
    id: 'bicing',
    name: 'Bicing',
    website: 'https://www.bicing.barcelona',
    systems: [
      { systemId: 'bike_barcelona', city: 'Barcelona', countryCode: 'ES' },
    ],
  },
  {
    id: 'bicimad',
    name: 'BiciMAD',
    website: 'https://www.bicimad.com',
    systems: [
      { systemId: 'bicimad_madrid', city: 'Madrid', countryCode: 'ES' },
    ],
  },
  {
    id: 'valenbisi',
    name: 'Valenbisi',
    website: 'https://www.valenbisi.es',
    systems: [
      { systemId: 'valence', city: 'Valencia', countryCode: 'ES' },
    ],
  },
  {
    id: 'oslo_bysykkel',
    name: 'Oslo Bysykkel',
    website: 'https://oslobysykkel.no',
    systems: [
      { systemId: 'oslobysykkel', city: 'Oslo', countryCode: 'NO' },
    ],
  },
  {
    id: 'bergen_bysykkel',
    name: 'Bergen Bysykkel',
    website: 'https://bergenbysykkel.no',
    systems: [
      { systemId: 'bergen-city-bike', city: 'Bergen', countryCode: 'NO' },
    ],
  },
  {
    id: 'hsl_citybikes',
    name: 'HSL City Bikes',
    website: 'https://www.hsl.fi/en/citybikes',
    systems: [
      { systemId: 'citybikes_helsinki', city: 'Helsinki', countryCode: 'FI' },
    ],
  },
  {
    id: 'bikemi',
    name: 'BikeMi',
    website: 'https://bikemi.com/en',
    systems: [
      { systemId: 'milan-bikemi', city: 'Milan', countryCode: 'IT' },
    ],
  },
  {
    id: 'mol_bubi',
    name: 'MOL Bubi',
    website: 'https://molbubi.hu',
    systems: [
      { systemId: 'inurba-budapest', city: 'Budapest', countryCode: 'HU' },
    ],
  },
  {
    id: 'dublinbikes',
    name: 'dublinbikes',
    website: 'https://www.dublinbikes.ie',
    systems: [
      { systemId: 'dublin', city: 'Dublin', countryCode: 'IE' },
    ],
  },
  {
    id: 'veloh',
    name: 'Vel\u2019OH!',
    website: 'https://myveloh.lu',
    systems: [
      { systemId: 'luxembourg', city: 'Luxembourg', countryCode: 'LU' },
    ],
  },
  {
    id: 'cyclocity_vilnius',
    name: 'Cyclocity Vilnius',
    website: 'https://www.cyclocity.lt',
    systems: [
      { systemId: 'vilnius', city: 'Vilnius', countryCode: 'LT' },
    ],
  },
  {
    id: 'bixi',
    name: 'BIXI Montr\u00e9al',
    website: 'https://www.bixi.com',
    systems: [
      { systemId: 'Bixi_MTL', city: 'Montreal', countryCode: 'CA' },
    ],
  },
  {
    id: 'bike_share_toronto',
    name: 'Bike Share Toronto',
    website: 'https://www.bikesharetoronto.com',
    systems: [
      { systemId: 'bike_share_toronto', city: 'Toronto', countryCode: 'CA' },
    ],
  },
  {
    id: 'mobi',
    name: 'Mobi Bike Share',
    website: 'https://www.mobibikes.ca',
    systems: [
      { systemId: 'Mobibikes_CA_Vancouver', city: 'Vancouver', countryCode: 'CA' },
    ],
  },
  {
    id: 'ecobici_cdmx',
    name: 'Ecobici CDMX',
    website: 'https://www.ecobici.cdmx.gob.mx',
    systems: [
      { systemId: 'MEX', city: 'Mexico City', countryCode: 'MX' },
    ],
  },
  {
    id: 'ecobici_ba',
    name: 'Ecobici Buenos Aires',
    website: 'https://www.buenosaires.gob.ar/ecobici',
    systems: [
      { systemId: 'bike_buenosaires', city: 'Buenos Aires', countryCode: 'AR' },
    ],
  },
  {
    id: 'bike_itau',
    name: 'Bike Ita\u00fa',
    website: 'https://bikeitau.com.br',
    systems: [
      { systemId: 'bike_rio', city: 'Rio de Janeiro', countryCode: 'BR' },
      { systemId: 'bike_sampa', city: 'São Paulo', countryCode: 'BR' },
      { systemId: 'bike_santiago', city: 'Santiago', countryCode: 'CL' },
    ],
  },
  {
    id: 'tembici_bogota',
    name: 'Tembici Bogot\u00e1',
    website: 'https://tembici.com.co',
    systems: [
      { systemId: 'bogota_bike', city: 'Bogotá', countryCode: 'CO' },
    ],
  },
  {
    id: 'docomo_bike_share',
    name: 'docomo bike share',
    website: 'https://docomo-cycle.jp',
    systems: [
      { systemId: 'docomo-cycle-tokyo', city: 'Tokyo', countryCode: 'JP' },
    ],
  },
  {
    id: 'careem_bike',
    name: 'Careem BIKE',
    website: 'https://www.careem.com/en-ae/careem-bike/',
    systems: [
      { systemId: 'careem_bike', city: 'Dubai', countryCode: 'AE' },
    ],
  },
  {
    id: 'capital_bikeshare',
    name: 'Capital Bikeshare',
    website: 'https://capitalbikeshare.com',
    systems: [
      { systemId: 'cabi', city: 'Washington, DC', countryCode: 'US' },
    ],
  },
  {
    id: 'divvy',
    name: 'Divvy',
    website: 'https://divvybikes.com',
    systems: [
      { systemId: 'lyft_chi', city: 'Chicago', countryCode: 'US' },
    ],
  },
  {
    id: 'bay_wheels',
    name: 'Bay Wheels',
    website: 'https://www.lyft.com/bikes/bay-wheels',
    systems: [
      { systemId: 'lyft_bay', city: 'San Francisco', countryCode: 'US' },
    ],
  },
  {
    id: 'bluebikes',
    name: 'Bluebikes',
    website: 'https://www.bluebikes.com',
    systems: [
      { systemId: 'bluebikes', city: 'Boston', countryCode: 'US' },
    ],
  },
];
