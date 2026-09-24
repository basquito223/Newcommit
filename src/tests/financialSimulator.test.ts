/**
 * VISAFlow — Automated Test Suite for Financial Simulator & Official Rates
 *
 * Verifies:
 * 1. Single Authoritative CAD conversion rate (445 FCFA/CAD)
 * 2. Official EUR conversion rate (655.957 FCFA/EUR)
 * 3. Hotel accommodation calculation (65 EUR/day)
 * 4. Attestation d'accueil accommodation calculation (32.50 EUR/day)
 * 5. Non-justified lodging accommodation calculation (120 EUR/day)
 * 6. Official Consular Rule resolver reachability for accommodation rules
 */

import {
  calculateFinancialSimulatorRequirements,
} from '../components/FinancialSimulator';
import {
  OFFICIAL_EXCHANGE_RATES,
  resolveOfficialRule,
} from '../data/officialConsularRules';

export function runFinancialSimulatorAudit(): { passed: boolean; testCount: number } {
  console.log('--- Running Financial Simulator & Rate Authority Audit ---');
  let testCount = 0;

  function assert(condition: boolean, message: string) {
    testCount++;
    if (!condition) {
      throw new Error(`[FAIL] Test #${testCount}: ${message}`);
    }
    console.log(`  ✓ Test ${testCount} Passed: ${message}`);
  }

  // 1. Authoritative CAD Rate SSoT
  assert(
    OFFICIAL_EXCHANGE_RATES.CAD_TO_FCFA === 445,
    'OFFICIAL_EXCHANGE_RATES.CAD_TO_FCFA is exactly 445'
  );

  // 2. Authoritative EUR Rate SSoT
  assert(
    OFFICIAL_EXCHANGE_RATES.EUR_TO_FCFA === 655.957,
    'OFFICIAL_EXCHANGE_RATES.EUR_TO_FCFA is exactly 655.957'
  );

  // 3. Hotel Calculation (65 EUR/day)
  const hotelSim = calculateFinancialSimulatorRequirements({
    selectedCountry: 'france',
    isStudy: false,
    stayDuration: 10,
    accommodation: 'hotel_confirme',
  });
  const expectedHotelFcfa = Math.round(10 * 65.0 * 655.957);
  assert(
    hotelSim.dailyRate === 65.0,
    `Hotel daily rate must be 65.0 EUR (got ${hotelSim.dailyRate})`
  );
  assert(
    hotelSim.requiredAmountFcfa === expectedHotelFcfa,
    `Hotel 10-day budget must be ${expectedHotelFcfa} FCFA (got ${hotelSim.requiredAmountFcfa})`
  );
  assert(
    hotelSim.visaFeeFcfa === Math.round(90 * 655.957),
    'Schengen adult visa fee is 90 EUR converted at 655.957'
  );

  // 4. Attestation d'accueil Calculation (32.50 EUR/day)
  const attestationSim = calculateFinancialSimulatorRequirements({
    selectedCountry: 'france',
    isStudy: false,
    stayDuration: 10,
    accommodation: 'attestation_accueil',
  });
  const expectedAttestationFcfa = Math.round(10 * 32.50 * 655.957);
  assert(
    attestationSim.dailyRate === 32.50,
    `Attestation d'accueil daily rate must be 32.50 EUR (got ${attestationSim.dailyRate})`
  );
  assert(
    attestationSim.requiredAmountFcfa === expectedAttestationFcfa,
    `Attestation d'accueil 10-day budget must be ${expectedAttestationFcfa} FCFA (got ${attestationSim.requiredAmountFcfa})`
  );

  // 5. Non-justified lodging Calculation (120 EUR/day)
  const noLodgingSim = calculateFinancialSimulatorRequirements({
    selectedCountry: 'france',
    isStudy: false,
    stayDuration: 10,
    accommodation: 'non_justifie' as any,
  });
  const expectedNoLodgingFcfa = Math.round(10 * 120.0 * 655.957);
  assert(
    noLodgingSim.dailyRate === 120.0,
    `Non-justified lodging daily rate must be 120.0 EUR (got ${noLodgingSim.dailyRate})`
  );
  assert(
    noLodgingSim.requiredAmountFcfa === expectedNoLodgingFcfa,
    `Non-justified lodging 10-day budget must be ${expectedNoLodgingFcfa} FCFA (got ${noLodgingSim.requiredAmountFcfa})`
  );

  // 6. Canada Tourism CAD Conversion
  const canadaTourismSim = calculateFinancialSimulatorRequirements({
    selectedCountry: 'canada',
    isStudy: false,
    stayDuration: 10,
    accommodation: 'hotel_confirme',
  });
  const expectedCadTourismFcfa = Math.round((150 * 10 + 1800) * 445);
  assert(
    canadaTourismSim.rateCadUsed === 445,
    'Canada simulator must use authoritative CAD rate 445'
  );
  assert(
    canadaTourismSim.requiredAmountFcfa === expectedCadTourismFcfa,
    `Canada 10-day tourist budget must be ${expectedCadTourismFcfa} FCFA (got ${canadaTourismSim.requiredAmountFcfa})`
  );
  assert(
    canadaTourismSim.visaFeeFcfa === Math.round((100 + 85) * 445),
    'Canada visitor visa fee + biometrics must be (100 + 85) * 445'
  );

  // 7. Canada Study CAD Conversion
  const canadaStudySim = calculateFinancialSimulatorRequirements({
    selectedCountry: 'canada',
    isStudy: true,
    stayDuration: 12,
    accommodation: 'residence_etudiante',
    tuitionFeesCad: 16000,
  });
  const expectedCadStudyFcfa = Math.round((23448 + 16000 + 2000) * 445);
  assert(
    canadaStudySim.requiredAmountFcfa === expectedCadStudyFcfa,
    `Canada study budget must be ${expectedCadStudyFcfa} FCFA (got ${canadaStudySim.requiredAmountFcfa})`
  );

  // 8. Official Consular Rule Resolver Reachability: Accommodation rules
  const hotelRule = resolveOfficialRule('france', 'tourisme_visite', 'subsistence_threshold', undefined, {
    accommodationType: 'hotel',
  });
  assert(
    hotelRule !== null && hotelRule.id === 'RULE-FR-SUBSISTENCE-HOTEL' && hotelRule.amount === 65,
    'Resolver reaches RULE-FR-SUBSISTENCE-HOTEL with amount 65'
  );

  const attestationRule = resolveOfficialRule('france', 'tourisme_visite', 'subsistence_threshold', undefined, {
    accommodationType: 'attestation_accueil',
  });
  assert(
    attestationRule !== null &&
      attestationRule.id === 'RULE-FR-SUBSISTENCE-ATTESTATION-ACCUEIL' &&
      attestationRule.amount === 32.5,
    'Resolver reaches RULE-FR-SUBSISTENCE-ATTESTATION-ACCUEIL with amount 32.5'
  );

  const noLodgingRule = resolveOfficialRule('france', 'tourisme_visite', 'subsistence_threshold', undefined, {
    accommodationType: 'non_justifie',
  });
  assert(
    noLodgingRule !== null &&
      noLodgingRule.id === 'RULE-FR-SUBSISTENCE-NO-LODGING-PROOF' &&
      noLodgingRule.amount === 120,
    'Resolver reaches RULE-FR-SUBSISTENCE-NO-LODGING-PROOF with amount 120'
  );

  console.log(`AUDIT PASSED: All ${testCount} Financial Simulator & Rate Authority tests succeeded.`);
  return { passed: true, testCount };
}

// Auto-run when executed directly via tsx
if (import.meta.url === `file://${process.argv[1]}`) {
  runFinancialSimulatorAudit();
}
