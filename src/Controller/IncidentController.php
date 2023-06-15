<?php

namespace App\Controller;

use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\HttpFoundation\Request;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;


use App\Service\IncidentsService;

use App\Entity\IncidentCategory;

use App\Form\IncidentType;

#[Route('/', name: 'app_')]

class IncidentController extends FrontController
{
    #[Route('/zone/{zone}/productline/{productline}/incident/{incidentid}', name: 'mandatory_incident')]
    public function mandatoryIncident(string $productline = null, int $incidentid = null): Response
    {
        $incidentEntity = $this->incidentRepository->findOneBy(['id' => $incidentid]);
        if (!$incidentEntity) {
            $productLine = $this->productLineRepository->findOneBy(['name' => $productline]);
        } else {
            $productLine = $incidentEntity->getProductLine();
        }

        $zone        = $productLine->getZone();
        $incidents = [];

        $incidents = $this->incidentRepository->findBy(
            ['ProductLine' => $productLine->getId()],
            ['id' => 'ASC'] // order by id ascending
        );

        $incidentIds = array_map(function ($incident) {
            return $incident->getId();
        }, $incidents);

        $currentIncidentKey = array_search($incidentid, $incidentIds);
        $incident = $incidents[$currentIncidentKey];
        if ($currentIncidentKey === false) {
            $incident = null;
        }

        $nextIncidentKey = $currentIncidentKey + 1;

        $nextIncident  = isset($incidents[$nextIncidentKey]) ? $incidents[$nextIncidentKey] : null;

        if ($incident) {
            return $this->render(
                '/services/incidents/incidents_view.html.twig',
                [
                    'incidentid'        => $incident ? $incident->getId() : null,
                    'incident'          => $incident,
                    'incidentCategory'  => $incident ? $incident->getIncidentCategory() : null,
                    'incidents'         => $incidents,
                    'productline'       => $productLine->getName(),
                    'zone'              => $zone->getName(),
                    'nextIncidentId'    => $nextIncident ? $nextIncident->getId() : null
                ]

            );
        } else {
            return $this->render(
                'productline.html.twig',
                [
                    'zone'        => $zone,
                    'categories'  => $this->categoryRepository->findAll(),
                    'productLine' => $productLine,
                ]
            );
        }
    }


    #[Route('/incident/incident_incidentsCategory_creation', name: 'incident_incidentsCategory_creation')]
    public function incidentCategoryCreation(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $incidentCategoryName = $data['incident_incidentsCategory_name'] ?? null;

        $existingIncidentCategory = $this->incidentCategoryRepository->findOneBy(['name' => $incidentCategoryName]);

        if (empty($incidentCategoryName)) {
            return new JsonResponse(['success' => false, 'message' => 'Le nom du category d\'incident ne peut pas être vide']);
        }
        if ($existingIncidentCategory) {
            return new JsonResponse(['success' => false, 'message' => 'Ce category d\'incident existe déjà']);
        } else {
            $incidentCategory = new IncidentCategory();
            $incidentCategory->setName($incidentCategoryName);
            $this->em->persist($incidentCategory);
            $this->em->flush();

            return new JsonResponse(['success' => true, 'message' => 'Le type d\'incident a été créé']);
        }
    }

    // Create a route for incidentCategory deletion
    #[Route('/incident/delete/incident_incidentsCategory_deletion/{incidentCategory}', name: 'incident_incidentsCategory_deletion')]
    public function incidentCategoryDeletion(string $incidentCategory, Request $request): Response
    {
        $entityType = "incidentCategory";
        $entityid = $this->incidentCategoryRepository->findOneBy(['name' => $incidentCategory]);
        $entity = $this->entitydeletionService->deleteEntity($entityType, $entityid->getId());
        $originUrl = $request->headers->get('referer');

        if ($entity == true) {

            $this->addFlash('success', $entityType . ' has been deleted');
            return $this->redirect($originUrl);
        } else {
            $this->addFlash('danger',  $entityType . '  does not exist');
            return $this->redirect($originUrl);
        }
    }



    // create a route to upload a file
    #[Route('/incident/incident_uploading', name: 'generic_upload_incident_files')]
    public function generic_upload_incident_files(IncidentsService $incidentsService, Request $request): Response
    {
        $this->incidentsService = $incidentsService;

        $originUrl = $request->headers->get('referer');

        // Check if the form is submitted
        if ($request->isMethod('POST')) {

            $productline = $request->request->get('incident_productline');
            $newname = $request->request->get('incidents_newFileName');
            $IncidentCategoryId = $request->request->get('incidents_incidentsCategory');
            $IncidentCategory = $this->incidentCategoryRepository->findoneBy(['id' => $IncidentCategoryId]);
            $productlineEntity = $this->productLineRepository->findoneBy(['id' => $productline]);

            // Use the IncidentsService to handle file Incidents
            $name = $this->incidentsService->uploadIncidentFiles($request, $productlineEntity, $IncidentCategory, $newname);
            $this->addFlash('success', 'Le document '  . $name .  ' a été correctement chargé');
            return $this->redirect($originUrl);
        } else {
            // Show an error message if the form is not submitted
            $this->addFlash('error', 'Le fichier n\'a pas été poster correctement.');
            return $this->redirect($originUrl);
        }
    }


    // create a route to download a file
    #[Route('/download_incident/{name}', name: 'incident_download_file')]
    public function download_file(string $name = null): Response
    {
        $file = $this->incidentRepository->findOneBy(['name' => $name]);
        $path = $file->getPath();
        $file       = new File($path);
        return $this->file($file, null, ResponseHeaderBag::DISPOSITION_INLINE);
    }


    // create a route to delete a file
    #[Route('/incident/delete/{productline}/{name}', name: 'incident_delete_file')]
    public function delete_file(string $name = null, string $productline = null, IncidentsService $incidentsService, Request $request): Response
    {
        $productlineEntity = $this->productLineRepository->findoneBy(['id' => $productline]);
        $originUrl = $request->headers->get('referer');

        // Use the incidentsService to handle file deletion
        $name = $incidentsService->deleteIncidentFile($name, $productlineEntity);
        $this->addFlash('success', 'File ' . $name . ' deleted');

        return $this->redirect($originUrl);
    }


    // create a route to modify a file and or display the modification page
    #[Route('/modify_incident/{incidentId}', name: 'incident_modify_file')]
    public function modify_incident_file(Request $request, int $incidentId, incidentsService $incidentsService): Response
    {
        // Retrieve the current incident entity based on the incidentId
        $incident = $this->incidentRepository->findOneBy(['id' => $incidentId]);
        $productLine = $incident->getProductLine();
        $zone = $productLine->getZone();
        $originUrl = $request->headers->get('referer');

        if (!$incident) {
            $this->addFlash('error', 'Le fichier n\'a pas été trouvé.');
            return $this->redirect($originUrl);
        }

        // Create a form to modify the Upload entity
        $form = $this->createForm(IncidentType::class, $incident);

        // Handle the form data on POST requests
        $form->handleRequest($request);


        if ($form->isSubmitted() && $form->isValid()) {
            // Process the form data and modify the Upload entity
            try {
                $incidentsService->modifyIncidentFile($incident);

                $this->addFlash('success', 'Le fichier a été modifié.');
                return $this->redirect($originUrl);
            } catch (\Exception $e) {
                $this->addFlash('error', 'Une erreur s\'est produite lors de la modification du fichier.');
                $response = [
                    'status'    => 'error',
                    'message'   => 'Une erreur s\'est produite lors de la modification du fichier.',
                    'error'     => $e->getMessage(),
                ];
                return new JsonResponse($response);
            }
        }

        // Convert the errors to an array
        $errorMessages = [];
        if ($form->isSubmitted() && !$form->isValid()) {
            // Get form errors
            $errors = $form->getErrors(true);

            foreach ($errors as $error) {
                $errorMessages[] = $error->getMessage();
            }

            // Return the errors in the JSON response
            $this->addFlash('error', 'Invalid form. Check the entered data.');
            return $this->redirect($originUrl);
        }

        // If it's a POST request but the form is not valid or not submitted
        if ($request->isMethod('POST')) {
            $this->addFlash('error', 'Invalid form. Errors: ' . implode(', ', $errorMessages));
            return $this->redirect($originUrl);
        }

        // If it's a GET request, render the form
        return $this->render('services/incidents/incidents_modification.html.twig', [
            'form'          => $form->createView(),
            'zone'          => $zone,
            'productLine'   => $productLine,
            'incident'      => $incident
        ]);
    }
}