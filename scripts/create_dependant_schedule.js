function getMedicationSchedule(isSingleDependant, isCareTakerSchedule) {
    return new Promise((resolve, reject) => {
      firebase.auth().onAuthStateChanged(async user => {
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
              id: doc.id, // Save document ID for later updates
              Medication: {
                name: medData.name || 'Not specified',
                frequency: medData.frequency || 'Not specified',
                startTime: medData.startTime || 'Not specified',
                startDate: medData.startDate || 'Not specified',
                endDate: medData.endDate || 'Not specified'
              },
              dependantId: dependantFromUrl,
              dependantName: null
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
                id: doc.id,
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
  
        // Now, for each medication, compute its schedule and update the document.
        const updatePromises = [];
  
        medications.forEach(med => {
          const medData = med.Medication;
          // Check that all necessary fields exist
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
  
          // Compute schedule entries for this medication
          let scheduleArray = [];
          for (let day = new Date(startDate); day <= endDate; day.setDate(day.getDate() + 1)) {
            const [startHour, startMinute] = medData.startTime.split(':').map(Number);
            let doseTime = new Date(day);
            doseTime.setHours(startHour, startMinute, 0, 0);
            const bedTimeHour = 22; // cutoff at 10 PM
            while (doseTime.getDate() === day.getDate() && doseTime.getHours() < bedTimeHour) {
              scheduleArray.push({
                doseTime: doseTime.toISOString(), // or you can store as a Firestore Timestamp later
                medication: medData.name
                // You can add more fields here if needed
              });
              doseTime.setHours(doseTime.getHours() + intervalHours);
            }
          }
          // Optionally sort the schedule array if needed
          scheduleArray.sort((a, b) => new Date(a.doseTime) - new Date(b.doseTime));
  
          // Update the medication document with the computed schedule array
          const medDocRef = firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('dependants')
            .doc(med.dependantId)
            .collection('medications')
            .doc(med.id);
  
          const updatePromise = medDocRef.update({ schedule: scheduleArray });
          updatePromises.push(updatePromise);
        });
  
        // Wait for all updates to complete
        Promise.all(updatePromises)
          .then(() => {
            resolve(medications); // or resolve(schedule if needed)
            console.log("Successfully updated each medication with its schedule!");
          })
          .catch(err => {
            console.error("Error updating medication schedule: ", err);
            reject(err);
          });
      });
    });
  }
  
  // Attach the function to the global window object
  window.getMedicationSchedule = getMedicationSchedule;
  