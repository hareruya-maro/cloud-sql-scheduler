
# Firebase Extension: Scheduled Cloud SQL Start/Stop

**Publisher:** (Your Publisher ID or Name)
**Extension ID:** `scheduled-cloud-sql-start-stop` (Example ID)
**Version:** 0.1.0 (Example Version)
**Source:** (Link to GitHub Repo)

## Description

This extension automatically starts and stops your Cloud SQL instances based on a configurable schedule (Cron expression) and timezone. It helps optimize costs by ensuring instances only run when needed, eliminating the need for manual intervention and reducing the risk of forgetting to stop instances, especially in development or staging environments.

You can define separate schedules for starting and stopping, and configure specific dates (holidays) or use a Google Calendar to skip scheduled actions. Optional Slack notifications can alert you to any failures during start or stop operations.

## Features

* **Scheduled Start/Stop:** Define Cron schedules to automatically start and stop a Cloud SQL instance.
* **Independent Schedules:** Configure only start, only stop, or both.
* **Timezone Aware:** Schedules are executed based on the specified timezone.
* **Flexible Holiday Skipping:**
    * Skip actions on specific dates provided in a comma-separated list.
    * (Optional) Skip actions based on all-day events in a specified Google Calendar.
    * Configure holidays independently for start and stop schedules.
* **Optional Failure Notifications:** Receive Slack notifications if the start or stop operation fails.
* **State Checking:** Avoids unnecessary API calls by checking the instance's current state before attempting an action.

## Prerequisites

* A Firebase project with the **Blaze (pay-as-you-go)** billing plan enabled.
* An existing Cloud SQL instance that you want to manage.
* The user installing the extension should have the **Owner** or **Firebase Admin** role in the Firebase project.

## Installation

You can install this extension using the Firebase console or the Firebase CLI:

```bash
firebase ext:install <publisher-id>/scheduled-cloud-sql-start-stop --project=<Your Project ID>
