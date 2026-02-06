import { Raga } from './melakartaRagas';

// Janya Ragas list
// IDs start from 101 to avoid conflict with Melakarta ragas (1-72)
export const JANYA_RAGAS: Raga[] = [
    {
        number: 101,
        name: "Mohanam",
        arohana: ["S", "R2", "G3", "P", "D2", ">S"],
        avarohana: [">S", "D2", "P", "G3", "R2", "S"],
        isMelakarta: false,
        parentMelakarta: 28 // Harikambhoji
    },
    {
        number: 102,
        name: "Hamsadhwani",
        arohana: ["S", "R2", "G3", "P", "N3", ">S"],
        avarohana: [">S", "N3", "P", "G3", "R2", "S"],
        isMelakarta: false,
        parentMelakarta: 29 // Shankarabharanam
    },
    {
        number: 103,
        name: "Hindolam",
        arohana: ["S", "G2", "M1", "D1", "N2", ">S"],
        avarohana: [">S", "N2", "D1", "M1", "G2", "S"],
        isMelakarta: false,
        parentMelakarta: 20 // Natabhairavi
    },
    {
        number: 104,
        name: "Abhogi",
        arohana: ["S", "R2", "G2", "M1", "D2", ">S"],
        avarohana: [">S", "D2", "M1", "G2", "R2", "S"],
        isMelakarta: false,
        parentMelakarta: 22 // Kharaharapriya
    },
    {
        number: 105,
        name: "Suddha Saveri",
        arohana: ["S", "R2", "M1", "P", "D2", ">S"],
        avarohana: [">S", "D2", "P", "M1", "R2", "S"],
        isMelakarta: false,
        parentMelakarta: 29 // Shankarabharanam
    },
    {
        number: 106,
        name: "Sriranjani",
        arohana: ["S", "R2", "G2", "M1", "D2", "N2", ">S"],
        avarohana: [">S", "N2", "D2", "M1", "G2", "R2", "S"],
        isMelakarta: false,
        parentMelakarta: 22 // Kharaharapriya
    },
    {
        number: 107,
        name: "Malahari",
        arohana: ["S", "R1", "M1", "P", "D1", ">S"],
        avarohana: [">S", "D1", "P", "M1", "G3", "R1", "S"],
        isMelakarta: false,
        parentMelakarta: 15 // Mayamalavagowla
    },
    {
        number: 108,
        name: "Bilahari",
        arohana: ["S", "R2", "G3", "P", "D2", ">S"],
        avarohana: [">S", "N3", "D2", "P", "M1", "G3", "R2", "S"],
        isMelakarta: false,
        parentMelakarta: 29 // Shankarabharanam
    },
    {
        number: 109,
        name: "Madhyamavati",
        arohana: ["S", "R2", "M1", "P", "N2", ">S"],
        avarohana: [">S", "N2", "P", "M1", "R2", "S"],
        isMelakarta: false,
        parentMelakarta: 22 // Kharaharapriya
    },
    {
        number: 110,
        name: "Shuddha Dhanyasi",
        arohana: ["S", "G1", "M1", "P", "N1", ">S"],
        avarohana: [">S", "N1", "P", "M1", "G1", "S"],
        isMelakarta: false,
        parentMelakarta: 22 // Kharaharapriya
    },
    {
        number: 111,
        name: "Abheri",
        arohana: ["S", "G2", "M1", "P", "N2", ">S"],
        avarohana: [">S", "N2", "D2", "P", "M1", "G2", "R2", "S"],
        isMelakarta: false,
        parentMelakarta: 22 // Kharaharapriya
    },
    {
        number: 112,
        name: "Kadanakuthuhalam",
        arohana: ["S", "R2", "M1", "D2", "N3", "G3", "P", ">S"],
        avarohana: [">S", "N3", "D2", "P", "M1", "G3", "R2", "S"],
        isMelakarta: false,
        parentMelakarta: 29 // Shankarabharanam
    }
];
