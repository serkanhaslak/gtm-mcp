# MergeConflict  |  Tag Platform  |  Google for Developers

Source: https://developers.google.com/tag-platform/tag-manager/api/reference/rest/v2/MergeConflict

"Home\nProducts\nTag Platform\nTag Manager\nREST API\nWas this helpful?\nSend feedback\nMergeConflict\n\nRepresents a merge conflict.\n\nJSON representation\n\n{\n \"entityInWorkspace\": {\n object (Entity)\n },\n \"entityInBaseVersion\": {\n object (Entity)\n }\n}\nFields\nentityInWorkspace\t\n\nobject (Entity)\n\nThe workspace entity that has conflicting changes compared to the base version. If an entity is deleted in a workspace, it will still appear with a deleted change status.\n\n\nentityInBaseVersion\t\n\nobject (Entity)\n\nThe base version entity (since the latest sync operation) that has conflicting changes compared to the workspace. If this field is missing, it means the workspace entity is deleted from the base version.\n\nWas this helpful?\nSend feedback"
