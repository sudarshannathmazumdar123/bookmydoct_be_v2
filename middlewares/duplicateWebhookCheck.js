const processedEventIds = new Set();
const processedLabTestEventIds = new Set();

exports.checkDuplicateEvent = (req, res, next) => {
  const eventId = req.headers["x-razorpay-event-id"];

  if (processedEventIds.has(eventId)) {
    // Duplicate event, skip processing
    console.log(`Duplicate event with ID ${eventId}. Skipping processing.`);
    res.status(200).send();
  } else {
    // Not a duplicate, continue with the next middleware or route handler
    processedEventIds.add(eventId);
    next();
  }
};

exports.checkDuplicateEventLabTest = (req, res, next) => {
  const eventId = req.headers["x-razorpay-event-id"];

  if (processedLabTestEventIds.has(eventId)) {
    // Duplicate event, skip processing
    console.log(`Duplicate event with ID ${eventId}. Skipping processing.`);
    res.status(200).send();
  } else {
    // Not a duplicate, continue with the next middleware or route handler
    processedLabTestEventIds.add(eventId);
    next();
  }
};
