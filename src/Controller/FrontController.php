<?php

namespace App\Controller;

use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\HttpFoundation\Request;

use App\Controller\UploadController;

use App\Entity\Department;

// This controller manage the logic of the front interface, it is the main controller of the application and is responsible for rendering the front interface.
// It is also responsible for creating the super-admin account.

#[Route('/', name: 'app_')]
class FrontController extends BaseController
{
    // Render the base page
    #[Route('/', name: 'base')]
    public function base(): Response
    {

        if ($this->settings->isUploadValidation() && $this->validationRepository->findAll() != null) {
            $this->validationService->remindCheck($this->users);
        }

        if ($this->departmentRepository->findAll() == null) {
            $Department = new Department();
            $Department->setName('I.T.');
            $this->em->persist($Department);
            $this->em->flush();
        }

        if ($this->settings->isTraining() && $this->authChecker->isGranted('ROLE_MANAGER')) {
            $countArray = $this->operatorService->operatorCheckForAutoDelete();
            if ($countArray != null) {
                $this->addFlash('info', ($countArray['inActiveOperators'] === 1 ? $countArray['inActiveOperators'] . ' opérateur inactif est à supprimer. ' : $countArray['inActiveOperators'] . ' opérateurs inactifs sont à supprimer. ') .
                    ($countArray['toBeDeletedOperators'] === 1 ? $countArray['toBeDeletedOperators'] . ' opérateur inactif n\'a été supprimé. ' : $countArray['toBeDeletedOperators'] . ' opérateurs inactifs ont été supprimés. '));
            }
        }

        return $this->render(
            'base.html.twig',
            [
                "zonesBase" => $this->zones,
                "zonesServices" => $this->cacheService->zones,
                "zoneRepo" => $this->zoneRepository->findAll(),
            ]
        );
    }
    #[Route('/cache', name: 'cache')]
    public function resetCache(Request $request): Response
    {
        $this->clearAndRebuildCachesArrays();
        $this->cacheService->clearAndRebuildCaches();
        return $this->redirectToRoute('app_base');
    }

    // This function is responsible for creating the super-admin account at the first connection of the application.
    #[Route('/createSuperAdmin', name: 'create_super_admin')]
    public function createSuperAdmin(Request $request): Response
    {
        $users = [];
        $users  = $this->users;

        if ($users == null) {

            $error = null;
            $result = $this->accountService->createAccount(
                $request,
                $error
            );
            if ($result) {
                $this->addFlash('success', 'Le compte de Super-Administrateur a bien été créé.');
            }
            if ($error) {
                $this->addFlash('error', $error);
            }
        } else {
            $this->addFlash('alert', 'Le compte de Super-Administrateur existe déjà.');
            return $this->redirectToRoute('app_base');
        }
        return $this->redirectToRoute('app_base');
    }


    // Render the zone page
    #[Route('/zone/{zoneId}', name: 'zone')]
    public function zone(int $zoneId = null): Response
    {

        // $zone = $this->cacheService->zones->filter(function ($zone) use ($zoneId) {
        //     return $zone->getId() === $zoneId;
        // })->first();

        $zone = $this->cacheService->getEntityById('zone', $zoneId);

        return $this->render(
            'zone.html.twig',
            [
                'zone'         => $zone
            ]
        );
    }


    // Render the productline page and redirect to the mandatory incident page if there is one
    #[Route('/zone/{zoneId}/productline/{productlineId}', name: 'productline')]
    public function productline(int $zoneId = null, int $productlineId = null): Response
    {

        // $productLine = $this->productLineRepository->find($productlineId);
        // $zone        = $productLine->getZone();

        $productLine = $this->cacheService->getEntityById('productLine', $productlineId);

        $zone = $this->cacheService->getEntityById('zone', $zoneId);

        $incidents = [];
        $incidents = $this->incidentRepository->findBy(
            ['ProductLine' => $productlineId],
            ['id' => 'ASC'] // order by id ascending
        );

        $incidentId = count($incidents) > 0 ? $incidents[0]->getId() : null;

        if (count($incidents) == 0) {

            return $this->render(
                'productline.html.twig',
                [
                    'zone'        => $zone,
                    'productLine' => $productLine
                ]
            );
        } else {
            return $this->redirectToRoute('app_mandatory_incident', [
                'zoneId' => $zoneId,
                'productlineId' => $productlineId,
                'incidentId' => $incidentId
            ]);
        }
    }



    // Render the category page and redirect to the button page if there is only one button in the category
    #[Route('/zone/{zoneId}/productline/{productlineId}/category/{categoryId}', name: 'category')]

    public function category(int $categoryId = null): Response
    {

        $buttons = [];
        $buttons = $this->buttonRepository->findBy(['Category' => $categoryId]);

        $category = $this->cacheService->getEntityById('category', $categoryId);
        $productLine = $this->cacheService->getEntityById('productLine', $category->getProductLine()->getId());
        $zone = $this->cacheService->getEntityById('zone', $productLine->getZone()->getId());

        $this->logger->info('buttons', [$buttons]);

        // if (count($buttons) != 1) {

        return $this->render(
            'category.html.twig',
            [
                'zone'        => $zone,
                'productLine' => $productLine,
                'category'    => $category,
                'matchingButtons' => $buttons,
            ]
        );
        // } else {
        //     $key = array_key_first($buttons);
        //     $buttonId = $buttons[$key]->getId();
        //     return $this->redirectToRoute('app_button', [
        //         'zoneId'        => $zone->getId(),
        //         'productlineId' => $productLine->getId(),
        //         'categoryId'    => $category->getId(),
        //         'buttonId'      => $buttonId
        //     ]);
        // }
    }


    // Render the button page and redirect to the upload page if there is only one upload in the button
    #[Route('/zone/{zoneId}/productline/{productlineId}/category/{categoryId}/button/{buttonId}', name: 'button')]
    public function buttonDisplay(UploadController $uploadController, int $buttonId = null, Request $request): Response
    {
        $buttonEntity = $this->buttonRepository->find($buttonId);
        $category    = $buttonEntity->getCategory();
        $productLine = $category->getProductLine();
        $zone        = $productLine->getZone();

        $buttonUploads = $this->uploadRepository->findBy(['button' => $buttonId]);
        $this->logger->info('buttonUploads', [$buttonUploads]);

        // foreach ($buttonUploads as $buttonUpload) {

        //     if ($buttonUpload->isValidated() || $buttonUpload->getValidation() != null || $buttonUpload->getOldUpload() != null) {
        //         $uploads[] = $buttonUpload;
        //     }
        // }


        if (count($buttonUploads) != 1) {
            return $this->render(
                'button.html.twig',
                [
                    'zone'        => $zone,
                    'productLine' => $productLine,
                    'category'    => $category,
                    'button'      => $buttonEntity,
                    'uploads'     => $buttonUploads,
                ]
            );
        } else {
            $uploadId = $buttonUploads[0]->getId();
            return $uploadController->filterDownloadFile($uploadId, $request);
        }
    }



    #[Route('/flash-messages', name: 'flash_messages')]
    public function flashMessages(Request $request): Response
    {
        return $this->render('services/_toasts.html.twig');
    }
}
