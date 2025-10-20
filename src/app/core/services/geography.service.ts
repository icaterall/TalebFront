import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Country {
  id: number;
  name: string;
  iso_code: string;
}

export interface State {
  id: number;
  name: string;
  country_id: number;
}

export interface GeoLocation {
  country_code: string;
  country_name: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeographyService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get all countries
   */
  getCountries(): Observable<{ countries: Country[] }> {
    return this.http.get<{ countries: Country[] }>(`${this.baseUrl}/countries`);
  }

  /**
   * Get states for a specific country
   */
  getStatesByCountry(countryId: number): Observable<{ states: State[] }> {
    return this.http.get<{ states: State[] }>(`${this.baseUrl}/countries/${countryId}/states`);
  }

  /**
   * Detect user's country based on IP address using ip-api.com
   * Returns country code (e.g., 'US', 'OM', 'SA')
   * Free service with CORS support, no API key required
   */
  detectCountryByIP(): Observable<string | null> {
    return this.http.get<any>('http://ip-api.com/json/?fields=countryCode').pipe(
      map(response => {
        console.log('IP API response:', response);
        if (response.countryCode) {
          console.log('Alpha-2 code from IP API:', response.countryCode);
          // Convert ISO alpha-2 to alpha-3 (e.g., 'OM' -> 'OMN')
          const alpha3 = this.convertAlpha2ToAlpha3(response.countryCode);
          console.log('Converted to alpha-3:', alpha3);
          return alpha3;
        }
        console.log('No country code in IP API response');
        return null;
      }),
      catchError(error => {
        console.error('Error detecting country by IP:', error);
        return of(null);
      })
    );
  }

  /**
   * Convert ISO 3166-1 alpha-2 code to alpha-3 code
   * e.g., 'OM' -> 'OMN', 'US' -> 'USA', 'SA' -> 'SAU'
   */
  private convertAlpha2ToAlpha3(alpha2: string): string {
    const alpha2ToAlpha3Map: { [key: string]: string } = {
      'AF': 'AFG', 'AL': 'ALB', 'DZ': 'DZA', 'AS': 'ASM', 'AD': 'AND',
      'AO': 'AGO', 'AI': 'AIA', 'AQ': 'ATA', 'AG': 'ATG', 'AR': 'ARG',
      'AM': 'ARM', 'AW': 'ABW', 'AU': 'AUS', 'AT': 'AUT', 'AZ': 'AZE',
      'BS': 'BHS', 'BH': 'BHR', 'BD': 'BGD', 'BB': 'BRB', 'BY': 'BLR',
      'BE': 'BEL', 'BZ': 'BLZ', 'BJ': 'BEN', 'BM': 'BMU', 'BT': 'BTN',
      'BO': 'BOL', 'BA': 'BIH', 'BW': 'BWA', 'BV': 'BVT', 'BR': 'BRA',
      'IO': 'IOT', 'BN': 'BRN', 'BG': 'BGR', 'BF': 'BFA', 'BI': 'BDI',
      'KH': 'KHM', 'CM': 'CMR', 'CA': 'CAN', 'CV': 'CPV', 'KY': 'CYM',
      'CF': 'CAF', 'TD': 'TCD', 'CL': 'CHL', 'CN': 'CHN', 'CX': 'CXR',
      'CC': 'CCK', 'CO': 'COL', 'KM': 'COM', 'CG': 'COG', 'CD': 'COD',
      'CK': 'COK', 'CR': 'CRI', 'CI': 'CIV', 'HR': 'HRV', 'CU': 'CUB',
      'CY': 'CYP', 'CZ': 'CZE', 'DK': 'DNK', 'DJ': 'DJI', 'DM': 'DMA',
      'DO': 'DOM', 'EC': 'ECU', 'EG': 'EGY', 'SV': 'SLV', 'GQ': 'GNQ',
      'ER': 'ERI', 'EE': 'EST', 'ET': 'ETH', 'FK': 'FLK', 'FO': 'FRO',
      'FJ': 'FJI', 'FI': 'FIN', 'FR': 'FRA', 'GF': 'GUF', 'PF': 'PYF',
      'TF': 'ATF', 'GA': 'GAB', 'GM': 'GMB', 'GE': 'GEO', 'DE': 'DEU',
      'GH': 'GHA', 'GI': 'GIB', 'GR': 'GRC', 'GL': 'GRL', 'GD': 'GRD',
      'GP': 'GLP', 'GU': 'GUM', 'GT': 'GTM', 'GG': 'GGY', 'GN': 'GIN',
      'GW': 'GNB', 'GY': 'GUY', 'HT': 'HTI', 'HM': 'HMD', 'VA': 'VAT',
      'HN': 'HND', 'HK': 'HKG', 'HU': 'HUN', 'IS': 'ISL', 'IN': 'IND',
      'ID': 'IDN', 'IR': 'IRN', 'IQ': 'IRQ', 'IE': 'IRL', 'IM': 'IMN',
      'IL': 'ISR', 'IT': 'ITA', 'JM': 'JAM', 'JP': 'JPN', 'JE': 'JEY',
      'JO': 'JOR', 'KZ': 'KAZ', 'KE': 'KEN', 'KI': 'KIR', 'KP': 'PRK',
      'KR': 'KOR', 'KW': 'KWT', 'KG': 'KGZ', 'LA': 'LAO', 'LV': 'LVA',
      'LB': 'LBN', 'LS': 'LSO', 'LR': 'LBR', 'LY': 'LBY', 'LI': 'LIE',
      'LT': 'LTU', 'LU': 'LUX', 'MO': 'MAC', 'MK': 'MKD', 'MG': 'MDG',
      'MW': 'MWI', 'MY': 'MYS', 'MV': 'MDV', 'ML': 'MLI', 'MT': 'MLT',
      'MH': 'MHL', 'MQ': 'MTQ', 'MR': 'MRT', 'MU': 'MUS', 'YT': 'MYT',
      'MX': 'MEX', 'FM': 'FSM', 'MD': 'MDA', 'MC': 'MCO', 'MN': 'MNG',
      'ME': 'MNE', 'MS': 'MSR', 'MA': 'MAR', 'MZ': 'MOZ', 'MM': 'MMR',
      'NA': 'NAM', 'NR': 'NRU', 'NP': 'NPL', 'NL': 'NLD', 'AN': 'ANT',
      'NC': 'NCL', 'NZ': 'NZL', 'NI': 'NIC', 'NE': 'NER', 'NG': 'NGA',
      'NU': 'NIU', 'NF': 'NFK', 'MP': 'MNP', 'NO': 'NOR', 'OM': 'OMN',
      'PK': 'PAK', 'PW': 'PLW', 'PS': 'PSE', 'PA': 'PAN', 'PG': 'PNG',
      'PY': 'PRY', 'PE': 'PER', 'PH': 'PHL', 'PN': 'PCN', 'PL': 'POL',
      'PT': 'PRT', 'PR': 'PRI', 'QA': 'QAT', 'RE': 'REU', 'RO': 'ROU',
      'RU': 'RUS', 'RW': 'RWA', 'BL': 'BLM', 'SH': 'SHN', 'KN': 'KNA',
      'LC': 'LCA', 'MF': 'MAF', 'PM': 'SPM', 'VC': 'VCT', 'WS': 'WSM',
      'SM': 'SMR', 'ST': 'STP', 'SA': 'SAU', 'SN': 'SEN', 'RS': 'SRB',
      'SC': 'SYC', 'SL': 'SLE', 'SG': 'SGP', 'SK': 'SVK', 'SI': 'SVN',
      'SB': 'SLB', 'SO': 'SOM', 'ZA': 'ZAF', 'GS': 'SGS', 'SS': 'SSD',
      'ES': 'ESP', 'LK': 'LKA', 'SD': 'SDN', 'SR': 'SUR', 'SJ': 'SJM',
      'SZ': 'SWZ', 'SE': 'SWE', 'CH': 'CHE', 'SY': 'SYR', 'TW': 'TWN',
      'TJ': 'TJK', 'TZ': 'TZA', 'TH': 'THA', 'TL': 'TLS', 'TG': 'TGO',
      'TK': 'TKL', 'TO': 'TON', 'TT': 'TTO', 'TN': 'TUN', 'TR': 'TUR',
      'TM': 'TKM', 'TC': 'TCA', 'TV': 'TUV', 'UG': 'UGA', 'UA': 'UKR',
      'AE': 'ARE', 'GB': 'GBR', 'US': 'USA', 'UM': 'UMI', 'UY': 'URY',
      'UZ': 'UZB', 'VU': 'VUT', 'VE': 'VEN', 'VN': 'VNM', 'VG': 'VGB',
      'VI': 'VIR', 'WF': 'WLF', 'EH': 'ESH', 'YE': 'YEM', 'ZM': 'ZMB',
      'ZW': 'ZWE'
    };
    
    const alpha3 = alpha2ToAlpha3Map[alpha2.toUpperCase()];
    if (!alpha3) {
      console.warn(`No alpha-3 code found for alpha-2 code: ${alpha2}`);
      return alpha2; // Return original if not found
    }
    return alpha3;
  }

  /**
   * Find country ID by country code (ISO code)
   */
  getCountryIdByCode(countryCode: string, countries: Country[]): number | null {
    const country = countries.find(c => 
      c.iso_code?.toUpperCase() === countryCode.toUpperCase()
    );
    return country ? country.id : null;
  }
}

