// medicationSchedule.js

function getMedicationSchedule(isSingleDependant, isCareTakerSchedule) {
    return new Promise((resolve, reject) => {
      firebase.auth().onAuthStateChanged(async user => {
        console.log(user.uid);
        if (!user) {
          return reject("No user logged in");
        }
        let medications = [];
        const urlParams = new URLSearchParams(window.location.search);
        const dependantFromUrl = urlParams.get('id');
  
        if (isSingleDependant) {
          // For a single dependant, use the dependant from the URL.
          const medsSnapshot = await firebase
            .firestore()
            .collection('users')
            .doc(user.uid)
            .collection('dependants')
            .doc(dependantFromUrl)
            .collection('medications')
            .get();
  
          medsSnapshot.docs.forEach(doc => {
            const medData = doc.data();
            medications.push({
              Medication: {
                name: medData.name || 'Not specified',
                frequency: medData.frequency || 'Not specified',
                startTime: medData.startTime || 'Not specified',
                startDate: medData.startDate || 'Not specified',
                endDate: medData.endDate || 'Not specified'
              },
              dependantName: null,
              dependantId: dependantFromUrl
            });
          });
        } else if (isCareTakerSchedule) {
          // For caretaker schedules, loop through all dependants.
          const dependantsSnapshot = await firebase
            .firestore()
            .collection('users')
            .doc(user.uid)
            .collection('dependants')
            .get();
  
          for (const dependantDoc of dependantsSnapshot.docs) {
            const dependantData = dependantDoc.data();
            const dependantId = dependantDoc.id;
            const dependantName = (dependantData.firstname && dependantData.lastname) ?
              `${dependantData.firstname} ${dependantData.lastname}` : 'Unnamed';

            const medsSnapshot = await firebase
              .firestore()
              .collection('users')
              .doc(user.uid)
              .collection('dependants')
              .doc(dependantId)
              .collection('medications')
              .get();
  
            medsSnapshot.docs.forEach(doc => {
              const medData = doc.data();
              medications.push({
                Medication: {
                  name: medData.name || 'Not specified',
                  frequency: medData.frequency || 'Not specified',
                  startTime: medData.startTime || 'Not specified',
                  startDate: medData.startDate || 'Not specified',
                  endDate: medData.endDate || 'Not specified'
                },
                dependantName: dependantName,
                dependantId: dependantId
              });

            });
          }
        }
  
        // Compute the schedule from the retrieved medications
        let sortedSchedule = [];
        medications.forEach(med => {
          const medData = med.Medication;
          if (!medData.startDate || !medData.endDate || !medData.startTime || !medData.frequency) {
            return;
          }
          const startDate = new Date(medData.startDate);
          const endDate = new Date(medData.endDate);
          let intervalHours = 24;
          const freqMatch = medData.frequency.match(/\d+/);
          if (freqMatch) {
            intervalHours = parseInt(freqMatch[0]);
          }
          for (let day = new Date(startDate); day <= endDate; day.setDate(day.getDate() + 1)) {
            const [startHour, startMinute] = medData.startTime.split(':').map(Number);
            let doseTime = new Date(day);
            doseTime.setHours(startHour, startMinute, 0, 0);
            const bedTimeHour = 22;
            while (doseTime.getDate() === day.getDate() && doseTime.getHours() < bedTimeHour) {
              const entry = {
                doseTime: new Date(doseTime),
                medication: medData.name
              };
              if (isCareTakerSchedule && med.dependantName) {
                entry.dependantName = med.dependantName;
              }
              entry.dependantId = med.dependantId;
              sortedSchedule.push(entry);
              doseTime.setHours(doseTime.getHours() + intervalHours);
            }
          }
        });
        
        sortedSchedule.sort((a, b) => a.doseTime - b.doseTime);
  
        const scheduleEntriesByDependant = {};
  
        sortedSchedule.forEach(entry => {
          const depId = entry.dependantId;
          if (!depId) return;
          if (!scheduleEntriesByDependant[depId]) {
            scheduleEntriesByDependant[depId] = [];
          }
          scheduleEntriesByDependant[depId].push(entry);
        });
  
        try {
          // Create an array to store all Firestore write promises
          const writePromises = [];
  
          for (const depId in scheduleEntriesByDependant) {
            const entries = scheduleEntriesByDependant[depId];
            
            firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('dependants')
            .doc(depId)
            .collection('schedule')
            .doc('medications').set({name:"medications"});

    
            firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('dependants')
            .doc('bbguOhW7WWDyy9Xf9wtR').collection('schedule')
            .doc('medications').collection('entries')
            .get()
            .then(docSnapshot => {
            docSnapshot.docs.map(doc => {
                console.log(doc.data());
            })
            })
            .catch(error => {
            console.error('Error fetching document:', error);
            });

            // Create the main 'medications' document first
            const medicationsDocRef = firebase.firestore()
              .collection('users')
              .doc(user.uid)
              .collection('dependants')
              .doc(depId)
              .collection('schedule')
              .doc('medications');
            
              
            // Add the initial document with a flag or metadata

            // Add individual medication entries
            entries.forEach(entry => {
              const entryPromise = medicationsDocRef
                .collection('entries')
                .add({
                  doseTime: firebase.firestore.Timestamp.fromDate(entry.doseTime),
                  medication: entry.medication,
                  ...(entry.dependantName ? { dependantName: entry.dependantName } : {})
                });
              
              writePromises.push(entryPromise);
            });
          }
  
          // Wait for all write operations to complete
          await Promise.all(writePromises);
          
          resolve(sortedSchedule);
          console.log("Successfully pushed schedule to Firestore!");
        } catch (err) {
          console.error("Error creating medication schedule: ", err);
          reject(err);
        }
      });
    });
}
  
// Attach the function to the global window object
window.getMedicationSchedule = getMedicationSchedule;