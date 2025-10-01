// sampleData.js
// Sem patří všechna data známek, která se budou importovat do katalogu

const sampleData = [
  {
    id: "cz-1983-01",
    year: 1983,
    catalogNumber: "A 2586",
    emission: "Interkosmos - 5. výročí letu SSSR-ČSSR",
    images: [
      "/img/1983/A2586.jpg"
    ],
    specs: [
      { label: "Datum vydání", value: "18.5. 1983" },
      { label: "Návrh", value: "V. Kovářík" },
      { label: "Rytec", value: "M. Ondráček" },
      { label: "Druh tisku", value: "OTp (ocelotisk z plochy)" },
      { label: "Tisková forma", value: "1 TF 2AP; 1 TF 1AP" },
      { label: "Zoubkování", value: "RZ 11 3/4" },
      { label: "Papír", value: "OZ" },
      { label: "Rozměr", value: "108x165 mm" },
      { label: "Náklad", value: "218 500 aršíků" },
      { label: "Schéma TF", value: "viz obrázek", tfImage: "/img/1983/A2586-TF.jpg" }
    ],
    studyNote: "F. Graman, zpravodaj SSČSZ 1/2012",
    defects: [
      {
        code: "A",
        descriptionText: "kresba sestupu",
        description: "Pod posledním padákem vpravo dole mezi plameny zlatá čárka chybí",
        image: "/img/1983/A2586-A-1.jpg"
      },
      {
        code: "A",
        descriptionText: "ZP2",
        description: "Hnědá čárka v písmenu Č slova výročí",
        image: "/img/1983/A2586-A-2.jpg"
      },
      {
        code: "A",
        descriptionText: "ZP3",
        description: "Další popis vady...",
        image: "/img/1983/A2586-A-3.jpg"
      }
    ]
  },
  // DUPLIKÁTY pro testování filtru
  {
    id: "cz-1984-01",
    year: 1984,
    catalogNumber: "A 2600",
    emission: "Pokus",
    images: [
      "/img/1983/A2586.jpg"
    ],
    specs: [
      { label: "Datum vydání", value: "18.5. 1984" },
      { label: "Návrh", value: "V. Kovářík" },
      { label: "Rytec", value: "M. Ondráček" },
      { label: "Druh tisku", value: "OTp (ocelotisk z plochy)" },
      { label: "Tisková forma", value: "1 TF 2AP; 1 TF 1AP" },
      { label: "Zoubkování", value: "RZ 11 3/4" },
      { label: "Papír", value: "OZ" },
      { label: "Rozměr", value: "108x165 mm" },
      { label: "Náklad", value: "218 500 aršíků" },
      { label: "Schéma TF", value: "viz obrázek", tfImage: "/img/1983/A2586-TF.jpg" }
    ],
    studyNote: "F. Graman, zpravodaj SSČSZ 1/2012",
    defects: [
      {
        code: "A",
        descriptionText: "kresba sestupu",
        description: "Pod posledním padákem vpravo dole mezi plameny zlatá čárka chybí",
        image: "/img/1983/A2586-A-1.jpg"
      },
      {
        code: "A",
        descriptionText: "ZP2",
        description: "Hnědá čárka v písmenu Č slova výročí",
        image: "/img/1983/A2586-A-2.jpg"
      },
      {
        code: "A",
        descriptionText: "ZP3",
        description: "Další popis vady...",
        image: "/img/1983/A2586-A-3.jpg"
      }
    ]
  },
    {
    id: "cz-1985-01",
    year: 1985,
    catalogNumber: "A 2700",
    emission: "Pokus2 - fsd fsdf sdff sdf fsdf sfd dsf sfsdfdsfsdfsdfsd sfd fsdfsdfs dfgsdfsfsdf",
    images: [
      "/img/1983/A2586.jpg"
    ],
    specs: [
      { label: "Datum vydání", value: "18.5. 1984" },
      { label: "Návrh", value: "V. Kovářík" },
      { label: "Rytec", value: "M. Ondráček" },
      { label: "Druh tisku", value: "OTp (ocelotisk z plochy)" },
      { label: "Tisková forma", value: "1 TF 2AP; 1 TF 1AP" },
      { label: "Zoubkování", value: "RZ 11 3/4" },
      { label: "Papír", value: "OZ" },
      { label: "Rozměr", value: "108x165 mm" },
      { label: "Náklad", value: "218 500 aršíků" },
      { label: "Schéma TF", value: "viz obrázek", tfImage: "/img/1983/A2586-TF.jpg" }
    ],
    studyNote: "F. Graman, zpravodaj SSČSZ 1/2012",
    defects: [
      {
        code: "A",
        descriptionText: "kresba sestupu",
        description: "Pod posledním padákem vpravo dole mezi plameny zlatá čárka chybí",
        image: "/img/1983/A2586-A-1.jpg"
      },
      {
        code: "A",
        descriptionText: "ZP2",
        description: "Hnědá čárka v písmenu Č slova výročí",
        image: "/img/1983/A2586-A-2.jpg"
      },
      {
        code: "A",
        descriptionText: "ZP3",
        description: "Další popis vady...",
        image: "/img/1983/A2586-A-3.jpg"
      }
    ]
  },

  {
    id: "cz-1983-02",
    year: 1983,
    catalogNumber: "PL 2596",
    emission: "Shromáždění za mír a život Praha",
    images: [
      "/img/1983/PL2596.jpg"
    ],
    specs: [
      { label: "Datum vydání", value: "6. 6. 1983" },
      { label: "Návrh", value: "V." },
      { label: "Rytec", value: "B. Housa" },
      { label: "Druh tisku", value: "OTp (ocelotisk z plochy)" },
      { label: "Tisková forma", value: "1 TF 4AP" },
      { label: "Zoubkování", value: "RZ 11 3/4" },
      { label: "Papír", value: "OZ" },
      { label: "Rozměr", value: " " },
      { label: "Náklad", value: "103 300 PL" },
      { label: "Schéma TF", value: "viz obrázek", tfImage: "/img/1983/PL2596-TF.jpg" }
    ],
    studyNote: "F. Graman, zpravodaj SSČSZ 1/2012",
    defects: [
      {
        code: "A1",
        descriptionText: "ZP3",
        label: "obr. 1",
        description: "Patka hodnotové číslice 2 neukončena svislou čarou, hodnota a nápis Kčs světlý",
        image: "/img/1983/A2586-A-1.jpg"
      },
      {
        code: "A2",
        descriptionText: "ZP3",
        label: "obr. 2",
        description: "Patka hodnotové číslice je seříznuta šikmo (retuš), hodnota a nápis Kčs normální",
        image: "/img/1983/A2586-A-2.jpg"
      },
      {
        code: "B",
        descriptionText: "ZP6",
        label: "obr. 3",
        description: "Hnědočerná skvrnka pod pravou příčkou písmena „T“ slova SVĚTU",
        image: "/img/1983/A2586-A-3.jpg"
      },
      {
        code: "C",
        descriptionText: "(doplň popis)",
        label: "obr. 4",
        description: "(doplň popis pro variantu 4)",
        image: "/img/1983/A2586-A-4.jpg"
      },
      {
        code: "C",
        descriptionText: "(doplň popis)",
        label: "obr. 5",
        description: "(doplň popis pro variantu 5)",
        image: "/img/1983/A2586-A-5.jpg"
      }
    ],
  }
  // Další známky lze přidávat stejným způsobem
];

export default sampleData;
